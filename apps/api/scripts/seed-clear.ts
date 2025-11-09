import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeederService } from '../src/database/seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seederService = app.get(SeederService);

  try {
    console.log('🗑️  Clearing database...');
    await seederService.clearAll();
    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Clearing failed:', error);
    await app.close();
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
