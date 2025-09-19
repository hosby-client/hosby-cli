import { Project } from "ts-morph";
import { globSync } from "glob";
import { ignorePatterns } from "../helpers/ignoreFiles.js";
import { mapType } from "../helpers/utils.js";
import { HosbySchema } from "../types/types.js";

export async function scanProject(path: string): Promise<HosbySchema> {
  const schema: HosbySchema = { tables: {} };

  const project = new Project();
  const tsFiles = globSync(`${path}/**/*.{ts,tsx,js,jsx,vue,svelte,json}`, {
    ignore: ignorePatterns,
  });

  project.addSourceFilesAtPaths(tsFiles);

  project.getSourceFiles().forEach(file => {
    file.getInterfaces().forEach(intf => {
      const tableName = intf.getName().toLowerCase() + "s";
      schema.tables[tableName] = {};

      intf.getProperties().forEach(prop => {
        const name = prop.getName();
        const type = prop.getType().getText();
        schema.tables[tableName][name] = mapType(type);
      });
    });
  });

  return schema;
}
