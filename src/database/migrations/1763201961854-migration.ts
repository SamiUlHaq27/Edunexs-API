import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1763201961854 implements MigrationInterface {
    name = 'Migration1763201961854'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tbl_institution" ("prefix" character varying NOT NULL, "name" character varying NOT NULL, "city" character varying NOT NULL, "country" character varying NOT NULL, "address" character varying NOT NULL, "logoUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "upodatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_2b915932b51ee1332d967656356" PRIMARY KEY ("prefix"))`);
        await queryRunner.query(`CREATE TABLE "tbl_auth" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying, "profilePictureUrl" character varying, "role" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_d87ed41c8373e079c6afb90f7e0" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "tbl_auth"`);
        await queryRunner.query(`DROP TABLE "tbl_institution"`);
    }

}
