import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeederService } from '../src/database/seeder.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seederService = app.get(SeederService);

  try {
    console.log('🌱 Starting database seeding...');
    await seederService.seedAll();
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await app.close();
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
