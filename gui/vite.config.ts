import { ConfigEnv, defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import solidPlugin from 'vite-plugin-solid'
import { execSync } from 'child_process'
// import devtools from 'solid-devtools/vite';

export default ({ mode }: ConfigEnv) => {
	const commitDate = execSync('git log -1 --format=%cI').toString().trimEnd()
	const branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trimEnd()
	const commitHash = execSync('git rev-parse HEAD').toString().trimEnd()
	const lastCommitMessage = execSync('git show -s --format=%s').toString().trimEnd()

	process.env.VITE_GIT_COMMIT_DATE = commitDate
	process.env.VITE_GIT_BRANCH_NAME = branchName
	process.env.VITE_GIT_COMMIT_HASH = commitHash
	process.env.VITE_GIT_LAST_COMMIT_MESSAGE = lastCommitMessage
	process.env.VITE_ENVIRONMENT = mode
	return defineConfig({
		plugins: [
			/*
			Uncomment the following line to enable solid-devtools.
			For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
			*/
			// devtools(),
			solidPlugin(),
			glsl(),
		],
		server: {
			port: 3000,
		},
		build: {
			target: 'esnext',
		},
	})
}
