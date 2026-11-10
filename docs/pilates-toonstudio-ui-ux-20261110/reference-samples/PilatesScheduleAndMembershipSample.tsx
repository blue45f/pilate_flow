import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/**
 * [독립 참조 컴포넌트] Pilates-flow 모바일 회원 예약·정원/대기/마감/취소·회원권 오류 방지 샘플
 * - 강사 전용 운영 앱(src/)과 분리된 docs/ 하위 디자인·상태 전이 참조 샘플입니다.
 * - 보강 사항:
 *   1) 예약(BOOK), 대기 신청(WAITLIST), 예약 취소(CANCEL_BOOKING), 대기 취소(CANCEL_WAITLIST) 확인 모달 및 상태 전이를 명확히 분리했습니다.
 *   2) 동기식 최신 상태 스냅샷(liveStateRef)과 모달 시퀀스 토큰(consumedDialogSeqRef)으로 연속 클릭·중복 제출 및 상태 전환 직후 재클릭 시 오작동을 방지합니다.
 *   3) 선택 수업 변경·차단 슬롯 클릭·외부 props(pass/slots/selectedDate/isOffline) 변경 시 오래된 확인 모달과 동의 체크 상태를 즉시 정리합니다.
 *   4) 모달 열림 시 초기 포커스 이동, Tab/Shift+Tab 포커스 이탈 방지, Escape·닫기 동등 처리 및 원래 트리거 포커스 복귀, 키보드 CTA 작동 및 disabled 우회 차단을 지원합니다.
 *   5) 실제 브라우저의 Enter/Space keydown→keyup→click 순서, 키 반복(repeat), 열기/닫기/확정 직후 키 떼기(keyup), 모달 배경 CTA 포인터·키보드 격리, 동일 화면 복수 샘플 인스턴스의 고유 dialog ID 및 최상위 모달 포커스 소유를 보장합니다.
 */

export type InstructorOccurrenceStatus = 'scheduled' | 'cancelled' | 'closed' | 'moved';
export type MemberSlotBookingStatus = 'AVAILABLE' | 'ALMOST_FULL' | 'WAITLIST' | 'CLOSED' | 'CANCELED';
export type BookingActionIntent = 'BOOK' | 'WAITLIST' | 'CANCEL_BOOKING' | 'CANCEL_WAITLIST';

export interface MemberPassLedger {
  readonly passId: string;
  readonly passTitle: string;
  readonly participantAlias: string;
  readonly remainingCount: number;
  readonly pendingReservedCount: number;
  readonly totalCount: number;
  readonly expiresAtIso: string;
}

export interface PilatesMemberClassSlot {
  readonly id: string;
  readonly classId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly title: string;
  readonly locationAlias: string;
  readonly instructorAlias: string;
  readonly equipmentLabels: readonly string[];
  readonly recommendedLayer: 'easy' | 'standard' | 'hard';
  readonly occurrenceStatus: InstructorOccurrenceStatus;
  readonly currentEnrolled: number;
  readonly maxCapacity: number;
  readonly waitlistCount: number;
  readonly maxWaitlist: number;
  readonly freeCancelHoursBefore: number;
  readonly myState: 'NONE' | 'BOOKED' | 'WAITLISTED';
  readonly myWaitlistOrder?: number;
}

interface PendingDialogState {
  readonly dialogSeq: number;
  readonly slotId: string;
  readonly intent: BookingActionIntent;
}

interface LiveBookingSnapshot {
  readonly pass: MemberPassLedger;
  readonly slots: readonly PilatesMemberClassSlot[];
  readonly pendingDialog: PendingDialogState | null;
  readonly policyAgreed: boolean;
  readonly selectedDate: string;
  readonly isOffline: boolean;
}

interface OpenModalRegistryEntry {
  readonly instanceKey: object;
  readonly getDialogEl: () => HTMLDivElement | null;
  readonly canClose: () => boolean;
  readonly close: () => void;
}

interface ModalRegistrySnapshot {
  readonly instanceNumbers: ReadonlyMap<object, number>;
  readonly openStack: readonly OpenModalRegistryEntry[];
}

interface InFlightTransitionKey {
  readonly key: 'Enter' | ' ' | 'Escape';
}

let nextMountedInstanceNumber = 0;
let inFlightTransitionKey: InFlightTransitionKey | null = null;
let globalKeyListenersAttached = false;

let modalRegistrySnapshot: ModalRegistrySnapshot = {
  instanceNumbers: new Map<object, number>(),
  openStack: [],
};
const modalRegistrySubscribers = new Set<() => void>();

function emitModalRegistryChange(): void {
  modalRegistrySubscribers.forEach((listener) => listener());
}

function subscribeModalRegistry(listener: () => void): () => void {
  modalRegistrySubscribers.add(listener);
  return () => {
    modalRegistrySubscribers.delete(listener);
  };
}

function getModalRegistrySnapshot(): ModalRegistrySnapshot {
  return modalRegistrySnapshot;
}

function isTransitionKey(key: string): key is 'Enter' | ' ' | 'Escape' {
  return key === 'Enter' || key === ' ' || key === 'Escape';
}

function getDialogFocusableElements(dialogEl: HTMLElement): HTMLElement[] {
  return Array.from(
    dialogEl.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (el) =>
      !el.hasAttribute('hidden') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.getAttribute('aria-disabled') !== 'true' &&
      el.style.display !== 'none' &&
      el.style.visibility !== 'hidden',
  );
}

function handleDocumentKeyDownCapture(event: KeyboardEvent): void {
  if (
    event.repeat &&
    inFlightTransitionKey !== null &&
    event.key === inFlightTransitionKey.key
  ) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (!event.repeat) {
    inFlightTransitionKey = null;
  }

  const openStack = modalRegistrySnapshot.openStack;
  const topModal = openStack[openStack.length - 1];
  if (!topModal) return;

  if (event.key === 'Escape') {
    if (event.repeat) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (topModal.canClose()) {
      event.preventDefault();
      event.stopPropagation();
      inFlightTransitionKey = { key: 'Escape' };
      topModal.close();
    }
    return;
  }

  const dialogEl = topModal.getDialogEl();
  if (!dialogEl) return;

  if (event.key === 'Tab') {
    const focusable = getDialogFocusableElements(dialogEl);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogEl.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const isInside = active instanceof Node && dialogEl.contains(active);

    if (event.shiftKey) {
      if (!isInside || active === first || active === dialogEl) {
        event.preventDefault();
        last.focus();
      }
    } else if (!isInside || active === last || active === dialogEl) {
      event.preventDefault();
      first.focus();
    }
    return;
  }

  if (
    (event.key === 'Enter' || event.key === ' ') &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    const targetNode = event.target instanceof Node ? event.target : document.activeElement;
    const isTargetInsideModal = targetNode !== null && dialogEl.contains(targetNode);
    if (!isTargetInsideModal) {
      event.preventDefault();
      event.stopPropagation();
      inFlightTransitionKey = { key: event.key };
      const focusable = getDialogFocusableElements(dialogEl);
      (focusable[0] ?? dialogEl).focus();
    }
  }
}

function handleDocumentKeyUpCapture(event: KeyboardEvent): void {
  if (
    inFlightTransitionKey !== null &&
    isTransitionKey(event.key) &&
    event.key === inFlightTransitionKey.key
  ) {
    inFlightTransitionKey = null;
    event.preventDefault();
    event.stopPropagation();
  }
}

function handleDocumentPointerDownCapture(): void {
  inFlightTransitionKey = null;
}

function syncGlobalKeyListeners(): void {
  if (typeof document === 'undefined') return;
  const shouldAttach = modalRegistrySnapshot.instanceNumbers.size > 0;
  if (shouldAttach && !globalKeyListenersAttached) {
    document.addEventListener('keydown', handleDocumentKeyDownCapture, true);
    document.addEventListener('keyup', handleDocumentKeyUpCapture, true);
    document.addEventListener('pointerdown', handleDocumentPointerDownCapture, true);
    document.addEventListener('mousedown', handleDocumentPointerDownCapture, true);
    globalKeyListenersAttached = true;
  } else if (!shouldAttach && globalKeyListenersAttached) {
    document.removeEventListener('keydown', handleDocumentKeyDownCapture, true);
    document.removeEventListener('keyup', handleDocumentKeyUpCapture, true);
    document.removeEventListener('pointerdown', handleDocumentPointerDownCapture, true);
    document.removeEventListener('mousedown', handleDocumentPointerDownCapture, true);
    globalKeyListenersAttached = false;
    inFlightTransitionKey = null;
  }
}

function registerSampleInstance(instanceKey: object): void {
  if (modalRegistrySnapshot.instanceNumbers.has(instanceKey)) return;
  const nextMap = new Map(modalRegistrySnapshot.instanceNumbers);
  nextMountedInstanceNumber += 1;
  nextMap.set(instanceKey, nextMountedInstanceNumber);
  modalRegistrySnapshot = {
    ...modalRegistrySnapshot,
    instanceNumbers: nextMap,
  };
  syncGlobalKeyListeners();
  emitModalRegistryChange();
}

function unregisterSampleInstance(instanceKey: object): void {
  const hadInstance = modalRegistrySnapshot.instanceNumbers.has(instanceKey);
  const nextStack = modalRegistrySnapshot.openStack.filter(
    (entry) => entry.instanceKey !== instanceKey,
  );
  if (!hadInstance && nextStack.length === modalRegistrySnapshot.openStack.length) {
    return;
  }
  const nextMap = new Map(modalRegistrySnapshot.instanceNumbers);
  nextMap.delete(instanceKey);
  modalRegistrySnapshot = {
    instanceNumbers: nextMap,
    openStack: nextStack,
  };
  syncGlobalKeyListeners();
  emitModalRegistryChange();
}

function pushOpenModalEntry(entry: OpenModalRegistryEntry): void {
  const filtered = modalRegistrySnapshot.openStack.filter(
    (item) => item.instanceKey !== entry.instanceKey,
  );
  modalRegistrySnapshot = {
    ...modalRegistrySnapshot,
    openStack: [...filtered, entry],
  };
  emitModalRegistryChange();
}

function removeOpenModalEntry(instanceKey: object): void {
  const nextStack = modalRegistrySnapshot.openStack.filter(
    (item) => item.instanceKey !== instanceKey,
  );
  if (nextStack.length === modalRegistrySnapshot.openStack.length) return;
  modalRegistrySnapshot = {
    ...modalRegistrySnapshot,
    openStack: nextStack,
  };
  emitModalRegistryChange();
}

function deriveMemberSlotStatus(slot: PilatesMemberClassSlot): MemberSlotBookingStatus {
  if (slot.occurrenceStatus === 'cancelled') return 'CANCELED';
  if (slot.occurrenceStatus === 'closed') return 'CLOSED';
  if (slot.currentEnrolled < slot.maxCapacity - 1) return 'AVAILABLE';
  if (slot.currentEnrolled === slot.maxCapacity - 1) return 'ALMOST_FULL';
  if (slot.waitlistCount < slot.maxWaitlist) return 'WAITLIST';
  return 'CLOSED';
}

function resolveSlotActionIntent(
  slot: PilatesMemberClassSlot,
  status: MemberSlotBookingStatus,
): BookingActionIntent | null {
  if (slot.occurrenceStatus === 'cancelled' || slot.occurrenceStatus === 'closed') {
    return null;
  }
  if (slot.myState === 'BOOKED') return 'CANCEL_BOOKING';
  if (slot.myState === 'WAITLISTED') return 'CANCEL_WAITLIST';
  if (status === 'AVAILABLE' || status === 'ALMOST_FULL') return 'BOOK';
  if (status === 'WAITLIST') return 'WAITLIST';
  return null;
}

function getExpiredTargetDate(
  selectedDate: string,
  slotDate: string,
  expiresAtIso: string,
): string | null {
  if (selectedDate > expiresAtIso) return selectedDate;
  if (slotDate > expiresAtIso) return slotDate;
  return null;
}

function isDialogStillValid(
  dialog: PendingDialogState,
  slots: readonly PilatesMemberClassSlot[],
  pass: MemberPassLedger,
  selectedDate: string,
  isOffline: boolean,
): boolean {
  if (isOffline) return false;
  const slot = slots.find((item) => item.id === dialog.slotId);
  if (!slot) return false;
  const currentIntent = resolveSlotActionIntent(slot, deriveMemberSlotStatus(slot));
  if (currentIntent !== dialog.intent) return false;
  if (dialog.intent === 'BOOK' || dialog.intent === 'WAITLIST') {
    if (getExpiredTargetDate(selectedDate, slot.date, pass.expiresAtIso) !== null) {
      return false;
    }
    if (pass.remainingCount <= 0) {
      return false;
    }
  }
  return true;
}

function activateButtonWithKeyboard(
  event: React.KeyboardEvent<HTMLButtonElement>,
  isDisabled: boolean,
  action: () => void,
): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  if (
    isDisabled ||
    event.currentTarget.disabled ||
    event.currentTarget.getAttribute('aria-disabled') === 'true'
  ) {
    event.preventDefault();
    return;
  }

  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return;
  }

  if (event.repeat) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  inFlightTransitionKey = { key: event.key };
  action();
}

const OFFLINE_BLOCKED_ALERT =
  '오프라인 상태에서는 실시간 정원과 수강권 잔여 횟수를 확인할 수 없습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
const ZERO_REMAINING_ALERT =
  '현재 수강권의 남은 횟수가 0회입니다. 스튜디오에 수강권 연장이나 재등록을 문의해 주세요.';

const SLOT_BADGE_TOKENS: Record<
  MemberSlotBookingStatus,
  { readonly icon: string; readonly labelKo: string; readonly fg: string; readonly bg: string; readonly border: string }
> = {
  AVAILABLE: {
    icon: '●',
    labelKo: '예약 가능',
    fg: 'var(--pf-color-status-success-text, #254B29)',
    bg: 'var(--pf-color-ai-draft-bg, #EEF2EA)',
    border: 'var(--pf-color-border-default, #D5DDD0)',
  },
  ALMOST_FULL: {
    icon: '▲',
    labelKo: '마감 임박 · 잔여 1석',
    fg: 'var(--pf-color-status-warning-text, #6B4010)',
    bg: 'var(--pf-color-ai-memo-bg, #F4F1E3)',
    border: '#E0D4C4',
  },
  WAITLIST: {
    icon: '◆',
    labelKo: '대기 가능',
    fg: 'var(--pf-color-status-warning-text, #6B4010)',
    bg: 'var(--pf-color-ai-memo-bg, #F4F1E3)',
    border: '#E0D4C4',
  },
  CLOSED: {
    icon: '■',
    labelKo: '정원 마감',
    fg: 'var(--pf-color-text-muted, #526358)',
    bg: 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
    border: 'var(--pf-color-border-default, #D5DDD0)',
  },
  CANCELED: {
    icon: '✕',
    labelKo: '폐강 안내',
    fg: 'var(--pf-color-status-danger-text, #8A341E)',
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
};

export const PilatesScheduleAndMembershipSample: React.FC<{
  readonly pass: MemberPassLedger;
  readonly slots: readonly PilatesMemberClassSlot[];
  readonly selectedDate: string;
  readonly isOffline?: boolean;
}> = ({ pass, slots, selectedDate, isOffline = false }) => {
  const reactHeadingId = useId();
  const reactDescriptionId = useId();
  const [instanceKey] = useState<object>(() => ({}));

  const registry = useSyncExternalStore(
    subscribeModalRegistry,
    getModalRegistrySnapshot,
    getModalRegistrySnapshot,
  );
  const instanceSeq = registry.instanceNumbers.get(instanceKey) ?? 0;
  const dialogHeadingId = `${reactHeadingId}-pf-dialog-title-${instanceSeq}`;
  const dialogDescriptionId = `${reactDescriptionId}-pf-dialog-desc-${instanceSeq}`;

  const [trackedProps, setTrackedProps] = useState({
    pass,
    slots,
    selectedDate,
    isOffline,
  });
  const [localPass, setLocalPass] = useState<MemberPassLedger>(pass);
  const [localSlots, setLocalSlots] = useState<readonly PilatesMemberClassSlot[]>(slots);
  const [pendingDialog, setPendingDialog] = useState<PendingDialogState | null>(null);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ readonly tone: 'status' | 'alert'; readonly text: string } | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const checkboxRef = useRef<HTMLInputElement | null>(null);
  const slotButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusReturnSlotIdRef = useRef<string | null>(null);
  const lastFocusedDialogSeqRef = useRef<number | null>(null);

  const submittingRef = useRef(false);
  const nextDialogSeqRef = useRef(0);
  const consumedDialogSeqRef = useRef(0);
  const liveStateRef = useRef<LiveBookingSnapshot>({
    pass,
    slots,
    pendingDialog: null,
    policyAgreed: false,
    selectedDate,
    isOffline,
  });

  if (
    trackedProps.pass !== pass ||
    trackedProps.slots !== slots ||
    trackedProps.selectedDate !== selectedDate ||
    trackedProps.isOffline !== isOffline
  ) {
    const passChanged = trackedProps.pass !== pass;
    const slotsChanged = trackedProps.slots !== slots;
    const dateChanged = trackedProps.selectedDate !== selectedDate;
    const becameOffline = !trackedProps.isOffline && isOffline;

    const effectivePass = passChanged ? pass : localPass;
    const effectiveSlots = slotsChanged ? slots : localSlots;

    setTrackedProps({ pass, slots, selectedDate, isOffline });
    if (passChanged) {
      setLocalPass(pass);
    }
    if (slotsChanged) {
      setLocalSlots(slots);
    }
    if (dateChanged || (becameOffline && feedback?.tone === 'status')) {
      setFeedback(null);
    }
    if (
      pendingDialog !== null &&
      (dateChanged ||
        !isDialogStillValid(pendingDialog, effectiveSlots, effectivePass, selectedDate, isOffline))
    ) {
      setPendingDialog(null);
      setPolicyAgreed(false);
    }
  }

  useLayoutEffect(() => {
    registerSampleInstance(instanceKey);
    return () => {
      unregisterSampleInstance(instanceKey);
    };
  }, [instanceKey]);

  useEffect(() => {
    liveStateRef.current = {
      pass: localPass,
      slots: localSlots,
      pendingDialog,
      policyAgreed,
      selectedDate,
      isOffline,
    };
  }, [localPass, localSlots, pendingDialog, policyAgreed, selectedDate, isOffline]);

  const activeDialogSlot = pendingDialog
    ? localSlots.find((item) => item.id === pendingDialog.slotId) ?? null
    : null;
  const activeDialogSeq = pendingDialog && activeDialogSlot ? pendingDialog.dialogSeq : null;
  const hasAnyOpenModal = activeDialogSeq !== null || registry.openStack.length > 0;
  const modalStackIndex = registry.openStack.findIndex((item) => item.instanceKey === instanceKey);
  const backdropZIndex = 1000 + (modalStackIndex >= 0 ? modalStackIndex : 0);

  const clearOpenDialogSync = (current: LiveBookingSnapshot, returnFocusSlotId: string | null = null) => {
    pendingFocusReturnSlotIdRef.current = returnFocusSlotId;
    liveStateRef.current = {
      ...current,
      pendingDialog: null,
      policyAgreed: false,
    };
    setPendingDialog(null);
    setPolicyAgreed(false);
  };

  useLayoutEffect(() => {
    if (activeDialogSeq === null) return undefined;

    pushOpenModalEntry({
      instanceKey,
      getDialogEl: () => dialogRef.current,
      canClose: () => !submittingRef.current && liveStateRef.current.pendingDialog !== null,
      close: () => {
        if (submittingRef.current) return;
        const current = liveStateRef.current;
        if (!current.pendingDialog) return;
        pendingFocusReturnSlotIdRef.current = current.pendingDialog.slotId;
        liveStateRef.current = {
          ...current,
          pendingDialog: null,
          policyAgreed: false,
        };
        setPendingDialog(null);
        setPolicyAgreed(false);
      },
    });

    return () => {
      removeOpenModalEntry(instanceKey);
    };
  }, [activeDialogSeq, instanceKey]);

  useEffect(() => {
    if (activeDialogSeq !== null) {
      if (lastFocusedDialogSeqRef.current !== activeDialogSeq) {
        lastFocusedDialogSeqRef.current = activeDialogSeq;
        const initialTarget = checkboxRef.current ?? dialogRef.current;
        initialTarget?.focus();
      }
      return;
    }

    lastFocusedDialogSeqRef.current = null;
    const returnSlotId = pendingFocusReturnSlotIdRef.current;
    if (returnSlotId !== null) {
      pendingFocusReturnSlotIdRef.current = null;
      const triggerButton = slotButtonRefs.current.get(returnSlotId);
      if (triggerButton && triggerButton.isConnected && !triggerButton.disabled) {
        triggerButton.focus();
      }
    }
  }, [activeDialogSeq]);

  const isExpiredForDate = selectedDate > localPass.expiresAtIso;
  const isExhausted = localPass.remainingCount <= 0;

  const handleOpenSlotAction = (slotId: string) => {
    if (submittingRef.current) return;
    const current = liveStateRef.current;

    if (current.isOffline) {
      clearOpenDialogSync(current, null);
      setFeedback({
        tone: 'alert',
        text: OFFLINE_BLOCKED_ALERT,
      });
      return;
    }

    const liveSlot = current.slots.find((item) => item.id === slotId);
    if (!liveSlot) {
      clearOpenDialogSync(current, null);
      return;
    }

    const liveStatus = deriveMemberSlotStatus(liveSlot);
    const intent = resolveSlotActionIntent(liveSlot, liveStatus);
    if (intent === null) {
      clearOpenDialogSync(current, null);
      return;
    }

    if (intent === 'BOOK' || intent === 'WAITLIST') {
      const expiredDate = getExpiredTargetDate(
        current.selectedDate,
        liveSlot.date,
        current.pass.expiresAtIso,
      );
      if (expiredDate !== null) {
        clearOpenDialogSync(current, null);
        setFeedback({
          tone: 'alert',
          text: `선택하신 수업 날짜(${expiredDate})가 수강권 만료일(${current.pass.expiresAtIso}) 이후입니다. 만료일 이전 날짜를 선택해 주세요.`,
        });
        return;
      }
      if (current.pass.remainingCount <= 0) {
        clearOpenDialogSync(current, null);
        setFeedback({
          tone: 'alert',
          text: ZERO_REMAINING_ALERT,
        });
        return;
      }
    }

    if (
      current.pendingDialog &&
      current.pendingDialog.slotId === liveSlot.id &&
      current.pendingDialog.intent === intent &&
      !current.policyAgreed
    ) {
      return;
    }

    pendingFocusReturnSlotIdRef.current = null;
    const nextDialog: PendingDialogState = {
      dialogSeq: ++nextDialogSeqRef.current,
      slotId: liveSlot.id,
      intent,
    };
    liveStateRef.current = {
      ...current,
      pendingDialog: nextDialog,
      policyAgreed: false,
    };
    setFeedback(null);
    setPolicyAgreed(false);
    setPendingDialog(nextDialog);
  };

  const handleTogglePolicyAgreed = (checked: boolean) => {
    if (submittingRef.current || !liveStateRef.current.pendingDialog) return;
    liveStateRef.current = {
      ...liveStateRef.current,
      policyAgreed: checked,
    };
    setPolicyAgreed(checked);
  };

  const handleCloseDialog = () => {
    if (submittingRef.current) return;
    const current = liveStateRef.current;
    if (!current.pendingDialog) return;
    clearOpenDialogSync(current, current.pendingDialog.slotId);
  };

  const handleConfirmAction = () => {
    const current = liveStateRef.current;
    const activeDialog = current.pendingDialog;
    if (
      !activeDialog ||
      !current.policyAgreed ||
      submittingRef.current ||
      consumedDialogSeqRef.current === activeDialog.dialogSeq
    ) {
      return;
    }

    if (current.isOffline) {
      clearOpenDialogSync(current, null);
      setFeedback({
        tone: 'alert',
        text: OFFLINE_BLOCKED_ALERT,
      });
      return;
    }

    const liveSlot = current.slots.find((item) => item.id === activeDialog.slotId);
    if (!liveSlot) {
      clearOpenDialogSync(current, null);
      setFeedback({
        tone: 'alert',
        text: '선택한 수업 정보를 찾을 수 없습니다. 시간표를 다시 확인해 주세요.',
      });
      return;
    }

    const liveStatus = deriveMemberSlotStatus(liveSlot);
    const liveIntent = resolveSlotActionIntent(liveSlot, liveStatus);
    if (liveIntent !== activeDialog.intent) {
      clearOpenDialogSync(current, liveSlot.id);
      setFeedback({
        tone: 'alert',
        text: '선택한 수업의 예약 가능 상태가 변경되었습니다. 현재 상태를 다시 확인해 주세요.',
      });
      return;
    }

    if (activeDialog.intent === 'BOOK' || activeDialog.intent === 'WAITLIST') {
      const expiredDate = getExpiredTargetDate(
        current.selectedDate,
        liveSlot.date,
        current.pass.expiresAtIso,
      );
      if (expiredDate !== null) {
        clearOpenDialogSync(current, liveSlot.id);
        setFeedback({
          tone: 'alert',
          text: `선택하신 수업 날짜(${expiredDate})가 수강권 만료일(${current.pass.expiresAtIso}) 이후입니다. 만료일 이전 날짜를 선택해 주세요.`,
        });
        return;
      }
      if (current.pass.remainingCount <= 0) {
        clearOpenDialogSync(current, liveSlot.id);
        setFeedback({
          tone: 'alert',
          text: ZERO_REMAINING_ALERT,
        });
        return;
      }
    }

    submittingRef.current = true;
    consumedDialogSeqRef.current = activeDialog.dialogSeq;
    setIsSubmitting(true);

    try {
      const { intent } = activeDialog;
      let nextPass = current.pass;
      let nextSlots = current.slots;
      let nextFeedbackText = '';

      if (intent === 'BOOK') {
        const nextRemaining = Math.max(0, current.pass.remainingCount - 1);
        nextPass = {
          ...current.pass,
          remainingCount: nextRemaining,
          pendingReservedCount: current.pass.pendingReservedCount + 1,
        };
        nextSlots = current.slots.map((item) =>
          item.id === liveSlot.id
            ? {
                ...item,
                currentEnrolled: Math.min(item.maxCapacity, item.currentEnrolled + 1),
                myState: 'BOOKED',
                myWaitlistOrder: undefined,
              }
            : item,
        );
        nextFeedbackText = `${liveSlot.date} ${liveSlot.startTime} [${liveSlot.title}] 예약을 확정했습니다. 수강권 1회가 차감되어 남은 횟수는 ${nextRemaining}회입니다.`;
      } else if (intent === 'WAITLIST') {
        const nextWaitlistCount = Math.min(liveSlot.maxWaitlist, liveSlot.waitlistCount + 1);
        const nextOrder = nextWaitlistCount;
        const nextRemaining = Math.max(0, current.pass.remainingCount - 1);
        nextPass = {
          ...current.pass,
          remainingCount: nextRemaining,
          pendingReservedCount: current.pass.pendingReservedCount + 1,
        };
        nextSlots = current.slots.map((item) =>
          item.id === liveSlot.id
            ? {
                ...item,
                waitlistCount: nextWaitlistCount,
                myState: 'WAITLISTED',
                myWaitlistOrder: nextOrder,
              }
            : item,
        );
        nextFeedbackText = `현재 대기 ${nextOrder}번으로 접수했습니다. 앞선 예약이 취소되면 수업 시작 2시간 전까지 순서대로 자동 승급됩니다.`;
      } else if (intent === 'CANCEL_BOOKING') {
        const nextRemaining = Math.min(current.pass.totalCount, current.pass.remainingCount + 1);
        nextPass = {
          ...current.pass,
          remainingCount: nextRemaining,
          pendingReservedCount: Math.max(0, current.pass.pendingReservedCount - 1),
        };
        nextSlots = current.slots.map((item) =>
          item.id === liveSlot.id
            ? {
                ...item,
                currentEnrolled: Math.max(0, item.currentEnrolled - 1),
                myState: 'NONE',
                myWaitlistOrder: undefined,
              }
            : item,
        );
        nextFeedbackText = `[${liveSlot.title}] 예약을 취소했습니다. 수강권 1회가 복구되어 현재 남은 횟수는 ${nextRemaining}회입니다.`;
      } else if (intent === 'CANCEL_WAITLIST') {
        const nextRemaining = Math.min(current.pass.totalCount, current.pass.remainingCount + 1);
        nextPass = {
          ...current.pass,
          remainingCount: nextRemaining,
          pendingReservedCount: Math.max(0, current.pass.pendingReservedCount - 1),
        };
        nextSlots = current.slots.map((item) =>
          item.id === liveSlot.id
            ? {
                ...item,
                waitlistCount: Math.max(0, item.waitlistCount - 1),
                myState: 'NONE',
                myWaitlistOrder: undefined,
              }
            : item,
        );
        nextFeedbackText = `[${liveSlot.title}] 대기 신청을 취소했습니다. 보류 중이던 수강권 1회가 복구되어 남은 횟수는 ${nextRemaining}회입니다.`;
      }

      pendingFocusReturnSlotIdRef.current = liveSlot.id;
      liveStateRef.current = {
        ...current,
        pass: nextPass,
        slots: nextSlots,
        pendingDialog: null,
        policyAgreed: false,
      };
      setLocalPass(nextPass);
      setLocalSlots(nextSlots);
      setPolicyAgreed(false);
      setPendingDialog(null);
      setFeedback({
        tone: 'status',
        text: nextFeedbackText,
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const confirmDisabled = !policyAgreed || isSubmitting || isOffline;

  return (
    <section
      aria-label="필라테스 회원 수업 예약"
      style={{
        backgroundColor: 'var(--pf-color-bg-canvas, #F7F5EF)',
        color: 'var(--pf-color-text-primary, #1E3129)',
        padding: 'var(--pf-space-4, 16px)',
        maxWidth: 480,
        margin: '0 auto',
        fontFamily: 'var(--pf-font-sans, Pretendard, sans-serif)',
      }}
    >
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--pf-color-ai-memo-bg, #F4F1E3)',
            color: 'var(--pf-color-status-warning-text, #6B4010)',
            border: '1px solid #E0D4C4',
            borderRadius: 'var(--pf-radius-md, 12px)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          인터넷 연결이 끊어져 이 기기에 마지막으로 저장된 시간표를 보여드리고 있어요. 실시간 잔여석 확인과 예약·취소는 연결 복구 후 가능합니다.
        </div>
      )}

      <article
        aria-label="내 수강권 현황"
        style={{
          backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
          border: '1px solid var(--pf-color-border-default, #D5DDD0)',
          borderRadius: 'var(--pf-radius-lg, 16px)',
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--pf-color-text-muted, #526358)' }}>
              회원 별칭: {localPass.participantAlias}
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: 18 }}>{localPass.passTitle}</h2>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 9999,
              backgroundColor: isExpiredForDate || isExhausted ? '#FFF1F2' : '#EEF2EA',
              color:
                isExpiredForDate || isExhausted
                  ? 'var(--pf-color-status-danger-text, #8A341E)'
                  : 'var(--pf-color-status-success-text, #254B29)',
            }}
          >
            {isExpiredForDate ? '✕ 선택일 기준 만료' : isExhausted ? '✕ 잔여 횟수 없음' : '● 정상 이용 중'}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 16px',
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--pf-color-text-secondary, #3D4F45)',
          }}
        >
          <span>
            남은 횟수: <strong>{localPass.remainingCount}회</strong> / {localPass.totalCount}회
          </span>
          <span>예약 중 홀드: {localPass.pendingReservedCount}회</span>
          <span>
            만료일: <strong>{localPass.expiresAtIso}</strong>
          </span>
        </div>
      </article>

      {feedback && (
        <p
          role={feedback.tone}
          aria-live={feedback.tone === 'alert' ? 'assertive' : 'polite'}
          style={{
            backgroundColor: feedback.tone === 'alert' ? '#FFF1F2' : '#EEF2EA',
            color:
              feedback.tone === 'alert'
                ? 'var(--pf-color-status-danger-text, #8A341E)'
                : 'var(--pf-color-status-success-text, #254B29)',
            border: '1px solid var(--pf-color-border-default, #D5DDD0)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {feedback.text}
        </p>
      )}

      {localSlots.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
            border: '1px dashed var(--pf-color-border-default, #D5DDD0)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            color: 'var(--pf-color-text-muted, #526358)',
            fontSize: 14,
          }}
        >
          선택하신 날짜에는 개설된 수업이 없거나 센터 휴무일입니다. 주간 날짜 선택에서 다른 요일을 확인해 보세요.
        </div>
      ) : (
        <div
          data-testid="pilates-slot-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            pointerEvents: hasAnyOpenModal ? 'none' : undefined,
          }}
        >
          {localSlots.map((slot) => {
            const status = deriveMemberSlotStatus(slot);
            const badge = SLOT_BADGE_TOKENS[status];
            const actionIntent = resolveSlotActionIntent(slot, status);
            const disabled = isOffline || isSubmitting || actionIntent === null;

            const buttonLabel =
              slot.myState === 'BOOKED'
                ? '예약 취소'
                : slot.myState === 'WAITLISTED'
                  ? `대기 ${slot.myWaitlistOrder ?? 1}번 취소`
                  : actionIntent === 'WAITLIST'
                    ? '대기 신청'
                    : status === 'CLOSED'
                      ? '마감됨'
                      : status === 'CANCELED'
                        ? '폐강'
                        : '예약하기';

            return (
              <article
                key={slot.id}
                aria-label={`${slot.startTime} ${slot.title}`}
                style={{
                  backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
                  border: '1px solid var(--pf-color-border-default, #D5DDD0)',
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                        {slot.startTime} – {slot.endTime}
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: badge.bg,
                          color: badge.fg,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        <span aria-hidden="true" style={{ marginRight: 4 }}>
                          {badge.icon}
                        </span>
                        {badge.labelKo}
                      </span>
                    </div>
                    <h3 style={{ margin: '8px 0 4px', fontSize: 17 }}>{slot.title}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-color-text-secondary, #3D4F45)' }}>
                      {slot.locationAlias} · {slot.instructorAlias} · 기구: {slot.equipmentLabels.join(', ')} · 권장 레이어({slot.recommendedLayer})
                    </p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 13,
                        color: 'var(--pf-color-text-muted, #526358)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      정원 {slot.currentEnrolled}/{slot.maxCapacity}명
                      {slot.waitlistCount > 0 ? ` · 대기 ${slot.waitlistCount}/${slot.maxWaitlist}명` : ''}
                    </p>
                  </div>

                  <button
                    ref={(node) => {
                      if (node) {
                        slotButtonRefs.current.set(slot.id, node);
                      } else {
                        slotButtonRefs.current.delete(slot.id);
                      }
                    }}
                    type="button"
                    tabIndex={hasAnyOpenModal ? -1 : undefined}
                    disabled={disabled}
                    aria-disabled={disabled}
                    onClick={() => {
                      if (disabled || !actionIntent) return;
                      handleOpenSlotAction(slot.id);
                    }}
                    onKeyDown={(event) => {
                      activateButtonWithKeyboard(event, disabled, () => {
                        if (disabled || !actionIntent) return;
                        handleOpenSlotAction(slot.id);
                      });
                    }}
                    aria-label={`${slot.startTime} ${slot.title} ${buttonLabel}`}
                    style={{
                      minHeight: 48,
                      minWidth: 96,
                      padding: '0 14px',
                      borderRadius: 9,
                      border: '1px solid var(--pf-color-action-primary, #173D34)',
                      backgroundColor: disabled
                        ? 'var(--pf-color-bg-surface-subtle, #F3F5EE)'
                        : 'var(--pf-color-action-primary, #173D34)',
                      color: disabled ? 'var(--pf-color-text-muted, #526358)' : '#FFFFFF',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {buttonLabel}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pendingDialog && activeDialogSlot && (
        <div
          data-testid="pilates-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              event.preventDefault();
            }
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              event.stopPropagation();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: backdropZIndex,
            backgroundColor: 'rgba(23, 61, 52, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            ref={dialogRef}
            key={`${pendingDialog.slotId}:${pendingDialog.intent}:${pendingDialog.dialogSeq}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogHeadingId}
            aria-describedby={dialogDescriptionId}
            tabIndex={-1}
            style={{
              width: '100%',
              maxWidth: 448,
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              border: '2px solid var(--pf-color-action-primary, #173D34)',
              borderRadius: 16,
              padding: 16,
              boxSizing: 'border-box',
              boxShadow: '0 16px 40px rgba(23, 61, 52, 0.2)',
            }}
          >
            <h4 id={dialogHeadingId} style={{ margin: '0 0 8px', fontSize: 17 }}>
              {pendingDialog.intent === 'BOOK'
                ? '수강권 차감 및 예약 확정 확인'
                : pendingDialog.intent === 'WAITLIST'
                  ? '대기 신청 및 보류 차감 확인'
                  : pendingDialog.intent === 'CANCEL_BOOKING'
                    ? '예약 취소 및 수강권 복구 확인'
                    : '대기 취소 및 보류 횟수 복구 확인'}
            </h4>
            <p
              id={dialogDescriptionId}
              style={{
                margin: '0 0 12px',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--pf-color-text-secondary, #3D4F45)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pendingDialog.intent === 'BOOK' && (
                <>
                  [{activeDialogSlot.date} {activeDialogSlot.startTime} {activeDialogSlot.title}] 예약 시 수강권 1회가 차감됩니다 (차감 전{' '}
                  <strong>{localPass.remainingCount}회</strong> → 차감 후{' '}
                  <strong>{Math.max(0, localPass.remainingCount - 1)}회</strong>). 수업 시작 {activeDialogSlot.freeCancelHoursBefore}시간 전 이후 취소 시에는 횟수가 복구되지 않습니다.
                </>
              )}
              {pendingDialog.intent === 'WAITLIST' && (
                <>
                  [{activeDialogSlot.date} {activeDialogSlot.startTime} {activeDialogSlot.title}] 대기{' '}
                  <strong>{activeDialogSlot.waitlistCount + 1}번</strong>으로 신청하며 수강권 1회가 보류 차감됩니다 (보류 전{' '}
                  <strong>{localPass.remainingCount}회</strong> → 보류 후{' '}
                  <strong>{Math.max(0, localPass.remainingCount - 1)}회</strong>). 미승급 또는 수업 전 대기 취소 시 100% 복구됩니다.
                </>
              )}
              {pendingDialog.intent === 'CANCEL_BOOKING' && (
                <>
                  [{activeDialogSlot.date} {activeDialogSlot.startTime} {activeDialogSlot.title}] 예약을 취소합니다. 무료 취소 마감({activeDialogSlot.freeCancelHoursBefore}시간 전) 이내 취소 시 수강권 1회가 복구됩니다 (현재{' '}
                  <strong>{localPass.remainingCount}회</strong> → 복구 후{' '}
                  <strong>{Math.min(localPass.totalCount, localPass.remainingCount + 1)}회</strong>).
                </>
              )}
              {pendingDialog.intent === 'CANCEL_WAITLIST' && (
                <>
                  [{activeDialogSlot.date} {activeDialogSlot.startTime} {activeDialogSlot.title}] 대기 신청을 취소하고 보류된 수강권 1회를 즉시 복구합니다 (현재{' '}
                  <strong>{localPass.remainingCount}회</strong> → 복구 후{' '}
                  <strong>{Math.min(localPass.totalCount, localPass.remainingCount + 1)}회</strong>).
                </>
              )}
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                fontSize: 13,
                marginBottom: 12,
                cursor: 'pointer',
              }}
            >
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={policyAgreed}
                onChange={(e) => handleTogglePolicyAgreed(e.target.checked)}
                onKeyDown={(event) => {
                  if (event.repeat && (event.key === ' ' || event.key === 'Enter')) {
                    event.preventDefault();
                  }
                }}
                style={{ width: 18, height: 18 }}
              />
              <span>
                {pendingDialog.intent === 'BOOK'
                  ? `1회 차감 및 무료 취소 마감 기한(${activeDialogSlot.freeCancelHoursBefore}시간 전)을 확인했습니다.`
                  : pendingDialog.intent === 'WAITLIST'
                    ? `대기 순번(${activeDialogSlot.waitlistCount + 1}번) 및 자동 승급·복구 기준을 확인했습니다.`
                    : '취소 및 수강권 복구 안내를 확인했습니다.'}
              </span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={confirmDisabled}
                aria-disabled={confirmDisabled}
                onClick={() => {
                  if (confirmDisabled) return;
                  handleConfirmAction();
                }}
                onKeyDown={(event) => {
                  activateButtonWithKeyboard(event, confirmDisabled, handleConfirmAction);
                }}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 9,
                  border: 'none',
                  backgroundColor: !confirmDisabled
                    ? 'var(--pf-color-action-primary, #173D34)'
                    : 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
                  color: !confirmDisabled ? '#FFFFFF' : 'var(--pf-color-text-muted, #526358)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: !confirmDisabled ? 'pointer' : 'not-allowed',
                }}
              >
                {pendingDialog.intent === 'BOOK'
                  ? '1회 차감 동의 및 예약 확정'
                  : pendingDialog.intent === 'WAITLIST'
                    ? '대기 신청 확정'
                    : pendingDialog.intent === 'CANCEL_BOOKING'
                      ? '예약 취소 확정'
                      : '대기 취소 확정'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                aria-disabled={isSubmitting}
                onClick={() => {
                  if (isSubmitting) return;
                  handleCloseDialog();
                }}
                onKeyDown={(event) => {
                  activateButtonWithKeyboard(event, isSubmitting, handleCloseDialog);
                }}
                style={{
                  minHeight: 48,
                  padding: '0 16px',
                  borderRadius: 9,
                  border: '1px solid var(--pf-color-border-default, #D5DDD0)',
                  backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
                  color: 'var(--pf-color-text-primary, #1E3129)',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
