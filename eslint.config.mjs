import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.deploy-runtime', '.firebase'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'BATCH_FIGURE_TITLES',
            'ATLAS_DISCOVERY_RECOVERY_KEY',
            'WORKBENCH_PREP_RECOVERY_KEY',
            'YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY',
            'buildIntegrationCallSnapshot',
            'mountMotionCoveragePreviewHarness',
            'getUpperBodyArmDiagramCorrections',
            'resolveUpperBodyArmDiagram',
            'resolveCoreAbdominalDiagram',
            'resolveBreathingPelvicDiagram',
            'getLateralAndApparatusDiagramCorrections',
            'resolveLateralAndApparatusDiagram',
            'resolveFootworkLowerDiagram',
          ],
        },
      ],
    },
  },
);
