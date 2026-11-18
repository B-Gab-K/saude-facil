-- NOT VALID preserves existing demonstration records while checking new writes.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_status_check"
  CHECK ("status" IN ('SOLICITAÇÃO RECEBIDA', 'EM ANÁLISE', 'REAGENDAMENTO SOLICITADO', 'ATENDIMENTO FINALIZADO', 'CANCELADO')) NOT VALID;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_date_format_check"
  CHECK ("data" ~ '^\d{4}-\d{2}-\d{2}$') NOT VALID;
CREATE INDEX "Appointment_criadoEm_idx" ON "Appointment"("criadoEm");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
