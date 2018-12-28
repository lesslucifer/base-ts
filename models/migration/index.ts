import fs from 'fs-extra';
import _ from "lodash";
import { isFunction } from "util";
import CONN, { AppConnections } from "../../glob/conn";

export abstract class Migrator {
    readonly autorun: boolean = false;
    readonly index: number = 0;
    name: string;

    abstract migrate(conn: AppConnections): Promise<void>;

    static MIGRATORS: Migrator[] = [];

    static async autoMigrate() {
        const migratorFiles = await fs.readdir(`${__dirname}/migrators`);
        const migrators: Migrator[] = _.sortBy(migratorFiles.map(f => this.loadMigrator(f)).filter(m => m != null), m => m.index);
        this.MIGRATORS = migrators;
        for (const mig of migrators) {
            if (mig.autorun) {
                await mig.migrate(CONN);
            }
        }
    }

    static async runMigrate(name: string) {
        const migrator = this.MIGRATORS.find(m => m.name == name);
        if (!migrator) return;

        await migrator.migrate(CONN);
    }

    private static loadMigrator(file: string) {
        function isImportable(file: string): boolean {
            const filePart = file.slice(-3);
            return filePart === '.js' || (filePart === '.ts' && file.slice(-5) !== '.d.ts');
        }
        
        try {
            if (!file || !isImportable(file)) return null;
            const migratorExport = require(`./migrators/${file}`);
            const migtatorClass = migratorExport.default || migratorExport;
            if (!isFunction(migtatorClass)) return null;
            
            const migrator = new migtatorClass();
            if (!(migrator instanceof Migrator)) return null;

            if (!migrator.name) {
                migrator.name = file.substring(0, file.length - 3);
            }
    
            return migrator;
        }
        catch (err) {
            return null;
        }
    }
}