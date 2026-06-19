import { describe, expect, it } from "bun:test";

const decoder = new TextDecoder();

function run(cmd: string[]) {
    const result = Bun.spawnSync({
        cmd,
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
    });
    return {
        exitCode: result.exitCode,
        stdout: decoder.decode(result.stdout),
        stderr: decoder.decode(result.stderr),
    };
}

describe("package ESM output", () => {
    it("is importable by Node's native ESM loader", () => {
        const build = run([ "bun", "run", "build" ]);
        if (build.exitCode !== 0) {
            throw new Error(build.stderr || build.stdout);
        }

        const nodeImport = run([
            "node",
            "-e",
            "Promise.all([import('./dist/index.js'), import('./dist/react.js')]).catch((error) => { console.error(error); process.exit(1); })",
        ]);

        expect(nodeImport.exitCode).toBe(0);
    });
});
