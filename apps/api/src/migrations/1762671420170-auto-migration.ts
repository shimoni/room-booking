import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1762671420170 implements MigrationInterface {
  name = 'AutoMigration1762671420170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`rooms\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`description\` text NULL, \`location\` json NOT NULL, \`price\` decimal(10,2) NOT NULL, \`capacity\` int NOT NULL, \`amenities\` json NULL, \`images\` json NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_0f5b2e686abd1fc76d4e7e70f5\` (\`price\`), INDEX \`IDX_5653eff5b30c7eb55445c87026\` (\`capacity\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`first_name\` varchar(100) NULL, \`last_name\` varchar(100) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`availability\` (\`room_id\` bigint NOT NULL, \`date\` date NOT NULL, \`status\` enum ('available', 'held', 'booked') NOT NULL DEFAULT 'available', \`hold_expires_at\` datetime NULL, \`version\` int NOT NULL DEFAULT '0', INDEX \`IDX_e1d567785af01e81a94a8fcf59\` (\`date\`), INDEX \`IDX_51af387f9f026d921fbd266367\` (\`status\`), INDEX \`IDX_2c7861567a70b35edcca81ed8e\` (\`hold_expires_at\`), PRIMARY KEY (\`room_id\`, \`date\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`bookings\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`user_id\` bigint NOT NULL, \`room_id\` bigint NOT NULL, \`check_in\` date NOT NULL, \`check_out\` date NOT NULL, \`guests\` int NOT NULL, \`status\` enum ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING', \`total_price\` decimal(10,2) NOT NULL, \`idempotency_key\` varchar(255) NOT NULL, \`payment_intent_id\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_64cd97487c5c42806458ab5520\` (\`user_id\`), INDEX \`IDX_48b267d894e32a25ebde4b207a\` (\`status\`), INDEX \`IDX_5ad78cbd837f006dec91f3612e\` (\`room_id\`, \`check_in\`, \`check_out\`), UNIQUE INDEX \`IDX_c827474891843af75341a82ced\` (\`idempotency_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`availability\` ADD CONSTRAINT \`FK_cfb0afb62cc0c95e70fc44682f1\` FOREIGN KEY (\`room_id\`) REFERENCES \`rooms\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` ADD CONSTRAINT \`FK_64cd97487c5c42806458ab5520c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` ADD CONSTRAINT \`FK_0b0fc32fe6bd0119e281628df7a\` FOREIGN KEY (\`room_id\`) REFERENCES \`rooms\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_0b0fc32fe6bd0119e281628df7a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_64cd97487c5c42806458ab5520c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`availability\` DROP FOREIGN KEY \`FK_cfb0afb62cc0c95e70fc44682f1\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c827474891843af75341a82ced\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_5ad78cbd837f006dec91f3612e\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_48b267d894e32a25ebde4b207a\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_64cd97487c5c42806458ab5520\` ON \`bookings\``,
    );
    await queryRunner.query(`DROP TABLE \`bookings\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_2c7861567a70b35edcca81ed8e\` ON \`availability\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_51af387f9f026d921fbd266367\` ON \`availability\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e1d567785af01e81a94a8fcf59\` ON \`availability\``,
    );
    await queryRunner.query(`DROP TABLE \`availability\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_5653eff5b30c7eb55445c87026\` ON \`rooms\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0f5b2e686abd1fc76d4e7e70f5\` ON \`rooms\``,
    );
    await queryRunner.query(`DROP TABLE \`rooms\``);
  }
}
