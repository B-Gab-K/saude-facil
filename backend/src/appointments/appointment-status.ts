export const AppointmentStatus = {
  RECEIVED: 'SOLICITAÇÃO RECEBIDA',
  IN_REVIEW: 'EM ANÁLISE',
  RESCHEDULE: 'REAGENDAMENTO SOLICITADO',
  FINISHED: 'ATENDIMENTO FINALIZADO',
  CANCELLED: 'CANCELADO',
} as const;

export const terminalStatuses: string[] = [AppointmentStatus.FINISHED, AppointmentStatus.CANCELLED];
