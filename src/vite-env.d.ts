/// <reference types="vite/client" />

// Allow TypeScript to accept Vite's ?raw asset imports for CSV files.
// importProjects.ts uses: import csvText from "../../NirmaanAI_Feature_Engineered.csv?raw"
declare module "*.csv?raw" {
  const content: string;
  export default content;
}
