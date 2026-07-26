import { NestFactory } from '@nestjs/core';
import { CommandModule } from './command.module';
import { CommandService } from 'nestjs-command';

async function bootstrap() {
  // some comment again
  const app = await NestFactory.createApplicationContext(CommandModule, {
    logger: ['error'],
  });

  try {
    await app.select(CommandModule).get(CommandService).exec();
    await app.close();
    // Nest tears the context down, but Redis/Prisma leave handles on the event
    // loop and node then lingers forever. On prod the process outlives the
    // `docker exec` client that started it: two abandoned runs held ~520 MB and
    // tripped the EC2 memory alarm on 2026-07-26. The awaited close above has
    // already flushed everything, so exit explicitly.
    process.exit(0);
  } catch (error) {
    console.error(error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
