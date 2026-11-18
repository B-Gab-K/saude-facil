CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "ubs" TEXT NOT NULL,
  "servico" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "hora" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "paciente" JSONB NOT NULL,
  "triagemResumo" TEXT NOT NULL,
  "observacao" TEXT NOT NULL,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
