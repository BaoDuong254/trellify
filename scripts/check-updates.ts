import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const packages = [
  ".",
  "apps/client",
  "apps/server",
  "packages/eslint",
  "packages/typescript",
  "packages/ui",
  "packages/shared",
];

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

async function checkUpdates() {
  console.log(`${colors.bold}${colors.cyan}📦 Checking updates for all packages...${colors.reset}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const pkg of packages) {
    const packagePath = resolve(process.cwd(), pkg);
    const packageJsonPath = resolve(packagePath, "package.json");

    if (!existsSync(packageJsonPath)) {
      console.log(`${colors.yellow}⚠️  Skipping ${pkg} - package.json not found${colors.reset}\n`);
      skippedCount++;
      continue;
    }

    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}${colors.green}📍 Checking: ${pkg}${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    try {
      execSync("ncu -u --removeRange", {
        cwd: packagePath,
        stdio: "inherit",
        encoding: "utf-8",
      });

      console.log(`${colors.green}✅ Updated ${pkg}${colors.reset}\n`);
      updatedCount++;
    } catch (error) {
      console.log(`${colors.red}❌ Error updating ${pkg}${colors.reset}`);
      if (error instanceof Error) {
        console.error(error.message);
      }
      console.log();
      errorCount++;
    }
  }

  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.green}✨ Done!${colors.reset}`);
  console.log(`${colors.green}   ✅ Updated: ${updatedCount} packages${colors.reset}`);
  if (skippedCount > 0) {
    console.log(`${colors.yellow}   ⚠️  Skipped: ${skippedCount} packages${colors.reset}`);
  }
  if (errorCount > 0) {
    console.log(`${colors.red}   ❌ Errors: ${errorCount} packages${colors.reset}`);
  }
  console.log(`\n${colors.cyan}💡 Run 'pnpm install' to install updated dependencies${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

checkUpdates().catch((error) => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
