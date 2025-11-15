import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1763203028993 implements MigrationInterface {
    name = 'Migration1763203028993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tbl_institution" ADD "ownerId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tbl_institution" ADD CONSTRAINT "UQ_aae992ff19cf974cfda52872aed" UNIQUE ("ownerId")`);
        await queryRunner.query(`ALTER TABLE "tbl_institution" ADD CONSTRAINT "FK_aae992ff19cf974cfda52872aed" FOREIGN KEY ("ownerId") REFERENCES "tbl_auth"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tbl_institution" DROP CONSTRAINT "FK_aae992ff19cf974cfda52872aed"`);
        await queryRunner.query(`ALTER TABLE "tbl_institution" DROP CONSTRAINT "UQ_aae992ff19cf974cfda52872aed"`);
        await queryRunner.query(`ALTER TABLE "tbl_institution" DROP COLUMN "ownerId"`);
    }

}
