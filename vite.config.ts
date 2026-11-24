import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { pwaBuild } from './scripts/pwa-build';
import { createFreeAiRoutes, createFreeAiService } from './backend/freeAiService';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let localSdkFallback = false;
try {
  require.resolve('@appdeploy/client');
} catch {
  localSdkFallback = true;
}

function createStudioAiServerPlugin(mode: string): Plugin {
  const attachMiddleware = (middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
  }) => {
    const fileEnv = loadEnv(mode, process.cwd(), '');
    const mergedServerEnv: Record<string, string | undefined> = {
      ...fileEnv,
      ...process.env,
    };
    const service = createFreeAiService({ env: mergedServerEnv });
    const routes = createFreeAiRoutes(service);

    middlewares.use((req, res, next) => {
      const rawUrl = req.url ?? '';
      const parsedUrl = new URL(rawUrl, 'http://localhost');
      if (
        parsedUrl.pathname !== '/api/studio/ai/status' &&
        parsedUrl.pathname !== '/api/studio/ai/assist'
      ) {
        next();
        return;
      }

      const query: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        query[key] = val;
      });
      const userIdHeader = req.headers['x-studio-user-id'];
      const userId =
        typeof userIdHeader === 'string' && userIdHeader.trim()
          ? userIdHeader.trim()
          : 'local-studio-instructor';

      const sendRouterResponse = (out: {
        statusCode: number;
        headers?: Record<string, string>;
        body: string;
      }) => {
        res.statusCode = out.statusCode;
        if (out.headers) {
          for (const [k, v] of Object.entries(out.headers)) {
            res.setHeader(k, v);
          }
        }
        res.end(out.body);
      };

      if (req.method === 'GET' && parsedUrl.pathname === '/api/studio/ai/status') {
        void routes['GET /api/studio/ai/status']({
          query,
          user: { userId, scope: 'user' },
        }).then(sendRouterResponse);
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/api/studio/ai/assist') {
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        let payloadTooLarge = false;
        req.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > 512_000) {
            payloadTooLarge = true;
            return;
          }
          chunks.push(chunk);
        });
        req.on('end', () => {
          if (payloadTooLarge) {
            sendRouterResponse({
              statusCode: 413,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'private, no-store',
              },
              body: JSON.stringify({
                error: 'payload_too_large',
                code: 'payload_too_large',
                message: '요청 본문이 허용 크기(512KB)를 초과했습니다.',
              }),
            });
            return;
          }
          let body: unknown;
          try {
            const rawBody = Buffer.concat(chunks).toString('utf8');
            body = rawBody.trim() ? JSON.parse(rawBody) : {};
          } catch {
            sendRouterResponse({
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'private, no-store',
              },
              body: JSON.stringify({
                error: 'invalid_request',
                code: 'invalid_request',
                message: '요청 본문 JSON 형식을 확인해 주세요.',
              }),
            });
            return;
          }
          void routes['POST /api/studio/ai/assist']({
            query,
            body,
            user: { userId, scope: 'user' },
          }).then(sendRouterResponse);
        });
        return;
      }

      next();
    });
  };

  return {
    name: 'pilates-flow-studio-ai-server',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

function createCompactArtworkManifestPlugin(): Plugin {
  return {
    name: 'pilates-flow-compact-artwork-manifest',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/data/exerciseArtworkManifest.json')) {
        return null;
      }
      const parsed = JSON.parse(code) as {
        schemaVersion: number;
        renderer: string;
        width: number;
        height: number;
        format: string;
        purpose: string;
        professionalReviewVerified: boolean;
        sourceFrameMappingVerified: boolean;
        entries: Record<
          string,
          {
            apparatus: string;
            bodyPosition: string;
            archetypeId: string;
            phases: Record<
              string,
              {
                src: string;
                labelKo?: string;
              }
            >;
          }
        >;
      };
      const compactEntries: Record<string, unknown> = {};
      for (const [exerciseId, entry] of Object.entries(parsed.entries)) {
        const compactPhases: Record<string, { src: string; labelKo?: string }> = {};
        for (const [phaseId, phase] of Object.entries(entry.phases)) {
          compactPhases[phaseId] = phase.labelKo
            ? { src: phase.src, labelKo: phase.labelKo }
            : { src: phase.src };
        }
        compactEntries[exerciseId] = {
          apparatus: entry.apparatus,
          bodyPosition: entry.bodyPosition,
          archetypeId: entry.archetypeId,
          phases: compactPhases,
        };
      }
      return {
        code: JSON.stringify({
          schemaVersion: parsed.schemaVersion,
          renderer: parsed.renderer,
          width: parsed.width,
          height: parsed.height,
          format: parsed.format,
          purpose: parsed.purpose,
          professionalReviewVerified: parsed.professionalReviewVerified,
          sourceFrameMappingVerified: parsed.sourceFrameMappingVerified,
          entries: compactEntries,
        }),
        map: null,
      };
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    createCompactArtworkManifestPlugin(),
    react(),
    pwaBuild(),
    createStudioAiServerPlugin(mode),
  ],
  resolve: {
    alias: localSdkFallback
      ? {
          '@appdeploy/client': fileURLToPath(
            new URL('./src/lib/localAppDeploy.ts', import.meta.url),
          ),
        }
      : {},
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@firebase/') || id.includes('/node_modules/firebase/')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-dom') || id.includes('node_modules/motion-utils')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          if (
            id.includes('node_modules/@tanstack/') ||
            id.includes('node_modules/zod') ||
            id.includes('node_modules/zustand')
          ) {
            return 'vendor-state';
          }
          if (id.includes('/src/data/exerciseArtworkManifest.json')) {
            return 'data-artwork-manifest';
          }
          if (
            id.includes('/src/data/expandedPilatesVideoCatalog.json') ||
            id.includes('/src/data/expandedPilatesVideoProvenance.json') ||
            id.includes('/src/data/verifiedPilatesYouTubeCatalog.json') ||
            id.includes('/src/data/exerciseVideoBindings.ts')
          ) {
            return 'data-video-catalog';
          }
          if (
            id.includes('/src/data/motionStudyLedger.json') ||
            id.includes('/src/data/extendedMotionSourceLedger.json') ||
            id.includes('/src/data/motionReviewSourceManifest.json') ||
            id.includes('/src/data/courseCollectionSource.json')
          ) {
            return 'data-motion-ledgers';
          }
          if (id.includes('/src/features/motionEvidenceReview/trackDExtendedApparatusEvidence.ts')) {
            return 'data-evidence-apparatus';
          }
          if (id.includes('/src/features/motionEvidenceReview/trackCExtendedMatEvidence.ts')) {
            return 'data-evidence-mat';
          }
          if (id.includes('/src/data/movementVisualRigCatalog.ts')) {
            return 'data-visual-rigs';
          }
          if (id.includes('/src/data/universal3dExerciseRigs.ts')) {
            return 'data-universal-3d-rigs';
          }
          if (id.includes('/src/data/classBlockPresets.ts')) {
            return 'data-class-presets';
          }
          if (
            id.includes('/src/data/worldPilatesAtomicSeeds.ts') ||
            id.includes('/src/data/worldPilatesFusionAndAdvancedSeeds.ts')
          ) {
            return 'data-world-atomic-seeds';
          }
          if (
            id.includes('/src/data/worldPilatesRepertoire1000.ts') ||
            id.includes('/src/data/globalCrawledRepertoirePack.ts') ||
            id.includes('/src/data/additionalPilatesVideoCatalog.json') ||
            id.includes('/src/data/creatorPilatesVideoCatalog.json') ||
            id.includes('/src/utils/videoSemanticMatching.ts')
          ) {
            return 'data-world-repertoire';
          }
          if (
            id.includes('/src/data/verifiedReferences.ts') ||
            id.includes('/src/data/publicReferences.ts') ||
            id.includes('/src/data/courseReferences.ts') ||
            id.includes('/src/data/motionPatternReferences.ts')
          ) {
            return 'data-verified-references';
          }
          if (
            id.includes('/src/data/extendedMotionVerificationCatalog.ts') ||
            id.includes('/src/data/movementVisualSourceAudit.ts') ||
            id.includes('/src/data/motionPhaseContextNotes.ts') ||
            id.includes('/src/data/motionReferences.ts') ||
            id.includes('/src/data/motionReferenceSource.json')
          ) {
            return 'data-motion-audit';
          }
          if (
            id.includes('/src/data/footworkLowerDiagramData.ts') ||
            id.includes('/src/data/footworkLowerSourceLedger.json') ||
            id.includes('/src/data/lateralAndApparatusDiagramData.ts') ||
            id.includes('/src/data/breathingPelvicDiagramData.ts') ||
            id.includes('/src/data/breathingPelvicSourceLedger.json') ||
            id.includes('/src/data/upperBodyArmDiagramData.ts')
          ) {
            return 'data-motion-diagrams';
          }
          if (
            id.includes('/src/components/MovementPhaseDiagramSvg.tsx') ||
            id.includes('/src/components/GeneratedPractitionerFigure.tsx') ||
            id.includes('/src/utils/generatedPractitionerArt.ts') ||
            id.includes('/src/utils/motionStudioMaterials.ts') ||
            id.includes('/src/data/expandedMovementVisualBindings.ts')
          ) {
            return 'feature-motion-phase-svg';
          }
          if (
            id.includes('/src/data/studioNeuralVoiceManifest.ts') ||
            id.includes('/src/utils/studioNeuralVoiceResolver.ts') ||
            id.includes('/src/utils/koreanVoiceNarration.ts') ||
            id.includes('/src/utils/breathingCadenceEngine.ts') ||
            id.includes('/src/utils/naturalVoiceScriptBuilder.ts') ||
            id.includes('/src/utils/naturalVoiceEngine.ts') ||
            id.includes('/src/utils/teachingVoiceCoachEngine.ts') ||
            id.includes('/src/components/NaturalVoiceSpeakButton.tsx') ||
            id.includes('/src/components/TeachingVoiceCoachPanel.tsx')
          ) {
            return 'feature-studio-voice';
          }
          if (
            id.includes('/src/utils/composableHierarchyEngine.ts') ||
            id.includes('/src/utils/sequenceAutomationEngine.ts') ||
            id.includes('/src/utils/studioPropAllocator.ts') ||
            id.includes('/src/utils/lessonFormatEngine.ts') ||
            id.includes('/src/utils/onDevicePoseAnalyzer.ts') ||
            id.includes('/src/utils/instructorChoreAutomation.ts') ||
            id.includes('/src/utils/studioBusinessAdvisorEngine.ts') ||
            id.includes('/src/components/StudioPropAllocatorPanel.tsx') ||
            id.includes('/src/components/SequenceAutoPilotDrawer.tsx') ||
            id.includes('/src/components/LessonModeSwitchPanel.tsx') ||
            id.includes('/src/components/SmartBusinessAdvisorPanel.tsx')
          ) {
            return 'feature-studio-automation';
          }
          if (
            id.includes('/src/data/pilatesCatalog.ts') ||
            id.includes('/src/data/originalMovements.ts') ||
            id.includes('/src/data/expandedMovements.ts')
          ) {
            return 'data-pilates-catalog';
          }
          if (
            id.includes('/src/store/') ||
            id.includes('/src/utils/sequenceEngine.ts') ||
            id.includes('/src/utils/sequenceSimulation.ts') ||
            id.includes('/src/utils/teachingHistorySnapshot.ts')
          ) {
            return 'core-store';
          }
          if (id.includes('/src/components/SequenceStudioWorkbench.tsx')) {
            return 'feature-studio-workbench';
          }
          if (id.includes('/src/components/DatedSequencePlanningDialog.tsx')) {
            return 'feature-dated-planning';
          }
          if (
            id.includes('/src/components/MemberBookingView.tsx') ||
            id.includes('/src/booking-core/')
          ) {
            return 'feature-member-booking';
          }
          return undefined;
        },
      },
    },
  },
}));
