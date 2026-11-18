import 'reflect-metadata';
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Module, Param, Patch, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const statuses = ['SOLICITAÇÃO RECEBIDA', 'EM ANÁLISE', 'REAGENDAMENTO SOLICITADO', 'ATENDIMENTO FINALIZADO', 'CANCELADO'];
const terminal = ['ATENDIMENTO FINALIZADO', 'CANCELADO'];
function input(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpException('Dados inválidos', HttpStatus.BAD_REQUEST);
  return value.trim();
}

@Controller('api/solicitacoes')
class AppointmentsController {
  @Get() list() { return db.appointment.findMany({ orderBy: { criadoEm: 'desc' } }); }

  @Post() async create(@Body() body: any) {
    const paciente = body?.paciente;
    if (!paciente || typeof paciente !== 'object' || Array.isArray(paciente)) throw new HttpException('Paciente inválido', 400);
    const data = input(body.data, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) throw new HttpException('Data inválida', 400);
    return db.appointment.create({data: {
      id: input(body.id, 100), codigo: input(body.codigo, 30), ubs: input(body.ubs, 150),
      servico: input(body.servico, 100), data, hora: 'A confirmar', status: 'SOLICITAÇÃO RECEBIDA',
      paciente: {nome: input(paciente.nome, 100), cpf: input(paciente.cpf, 20), nasc: input(paciente.nasc, 10), sus: typeof paciente.sus === 'string' ? paciente.sus.slice(0, 15) : ''},
      triagemResumo: input(body.triagemResumo, 800), observacao: ''
    }});
  }

  @Patch(':id') async update(@Param('id') id: string, @Body() body: any) {
    const previous = await db.appointment.findUnique({where: {id}});
    if (!previous) throw new HttpException('Solicitação não encontrada', 404);
    if (terminal.includes(previous.status)) throw new HttpException('Solicitação encerrada', 409);
    const status = body.status === undefined ? previous.status : input(body.status, 40);
    if (!statuses.includes(status)) throw new HttpException('Status inválido', 400);
    const data = body.data === undefined ? previous.data : input(body.data, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) throw new HttpException('Data inválida', 400);
    return db.appointment.update({where: {id}, data: {status, data, ubs: body.ubs === undefined ? previous.ubs : input(body.ubs, 150), servico: body.servico === undefined ? previous.servico : input(body.servico, 100), observacao: typeof body.observacao === 'string' ? body.observacao.slice(0, 1000) : previous.observacao}});
  }

  @Delete(':id') async delete(@Param('id') id: string) {
    const result = await db.appointment.deleteMany({where: {id}});
    if (!result.count) throw new HttpException('Solicitação não encontrada', 404);
    return {ok: true};
  }
}
@Module({controllers: [AppointmentsController]}) class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({origin: ['http://localhost:8000', 'http://127.0.0.1:8000']});
  app.enableShutdownHooks();
  await db.$connect();
  await app.listen(Number(process.env.PORT || 3001), '127.0.0.1');
}
bootstrap().catch(error => { console.error(error); process.exit(1); });
