# Changelog

## [1.7.0](https://github.com/BaoDuong254/trellify/compare/v1.6.0...v1.7.0) (2026-10-25)


### Features

* add ai-catalog.json for Trellify configuration ([a8520bb](https://github.com/BaoDuong254/trellify/commit/a8520bb91878322a366e2510cefe1af1f020991c))
* add ArgoCD application and project configurations for platform and trellify [skip ci] ([29bb1fc](https://github.com/BaoDuong254/trellify/commit/29bb1fcbbc6a2de70cc762fbbc3f8715f6481430))
* add due date, labels, and checklist functionality to cards ([f82c89f](https://github.com/BaoDuong254/trellify/commit/f82c89fecbc79e78dd4f9afa69d7f7fd26afde34))
* add environment variables for Postman and implement board loader hook ([b58babc](https://github.com/BaoDuong254/trellify/commit/b58babc08166bc522862f6db68861c4fdb06d5de))
* add Google site verification meta tag and update Content Security Policy hashes ([ba2651a](https://github.com/BaoDuong254/trellify/commit/ba2651abadf85fec529efa2b72c816397931a51d))
* add Grafana dashboard configuration for Trellify server metrics ([ddb6020](https://github.com/BaoDuong254/trellify/commit/ddb6020393d4cdb0af6025c4a403acf91edd4d66))
* add k6 load testing scripts and configuration ([c940e68](https://github.com/BaoDuong254/trellify/commit/c940e68346dec7dbf6eac52c4368da95ad159446))
* add knip configuration and prettier plugin for import sorting ([3754cd1](https://github.com/BaoDuong254/trellify/commit/3754cd1b6bab7a51297b09a3c481fde04b840d6e))
* add Kubernetes configuration files for cloudflared deployment and ingress [skip ci] ([b77c362](https://github.com/BaoDuong254/trellify/commit/b77c362096e3172ac5b5de8832ef00ff67577559))
* add member removal functionality to board service and routes ([180f45e](https://github.com/BaoDuong254/trellify/commit/180f45eb0ced7d3b9d5a619febc56c74ada89639))
* add metrics for skipped and coalesced board broadcasts; enhance broadcast logic ([9596ac9](https://github.com/BaoDuong254/trellify/commit/9596ac98fddfd08b663e21dcde8a481157d57385))
* add MongoDB metrics service, exporter, and Prometheus rules for enhanced monitoring ([5c31730](https://github.com/BaoDuong254/trellify/commit/5c317300075bad8c18361d613575bca441374642))
* add new skills for open code review delegation [skip ci] ([f6e554f](https://github.com/BaoDuong254/trellify/commit/f6e554f04ad61d987db64850b77af8c496282fd8))
* add observability components including Grafana and Prometheus configurations ([e914d68](https://github.com/BaoDuong254/trellify/commit/e914d6850eda04c01560db48ed23bfb99bbab64c))
* add onTimeout handler to TurnstileField in authentication forms ([099beec](https://github.com/BaoDuong254/trellify/commit/099beecc52126064e78294cd8134ad6371edabca))
* add Portainer support to deployment workflow and create docker-compose configuration ([eaf16b2](https://github.com/BaoDuong254/trellify/commit/eaf16b24842264fe1c315fe835d552efd411c728))
* add preload error handling ([ea13e61](https://github.com/BaoDuong254/trellify/commit/ea13e61db53f77249dab493676ab66b01e238738))
* add releaseName to helm configuration in platform ingress and sealed secrets [skip ci] ([d0dcdf4](https://github.com/BaoDuong254/trellify/commit/d0dcdf41ae5e52349fe846945aad7dbf5d09192d))
* add rollup-plugin-visualizer to project dependencies and configuration ([9271aaa](https://github.com/BaoDuong254/trellify/commit/9271aaaef21c5e3db1c04dfee41786203090ad31))
* add skeleton loading for card cover image with visibility control ([47c1659](https://github.com/BaoDuong254/trellify/commit/47c16591ae28eb43da4d8a6f64e89a0ef6333a7f))
* add SonarCloud integration and update sonar project version handling ([5d68264](https://github.com/BaoDuong254/trellify/commit/5d682642d231ddb6a0d044805fc8bdad2b159514))
* add trellify-prod ArgoCD application configuration [skip ci] ([e8181fa](https://github.com/BaoDuong254/trellify/commit/e8181fa9e932130a920cd87e0cbc7dbe04a81370))
* add unlighthouse configuration and GitHub Actions workflow for automated scanning ([7c81b77](https://github.com/BaoDuong254/trellify/commit/7c81b778ef20b2ce082a5bcd06c548f79ebb793b))
* add worker health check and improve server configuration ([27f9e26](https://github.com/BaoDuong254/trellify/commit/27f9e26571833ab7b12a218e65a9de2b2356dde8))
* **deploy:** reduce memory requests and limits for client, server, and worker deployments ([7e01643](https://github.com/BaoDuong254/trellify/commit/7e01643282ef536f5e9f37e667ce64aa118133d4))
* **dev:** add Tilt and kind configuration for local development cluster ([8a20cbc](https://github.com/BaoDuong254/trellify/commit/8a20cbc5dda71d88cbba3bd12256f25a38dc23b5))
* enhance alertmanager notification formatting for clarity and status indication ([6a27b6d](https://github.com/BaoDuong254/trellify/commit/6a27b6d60b3bf9f9e701aa9189acf2daf971d3dd))
* enhance authentication flow and security measures ([5face70](https://github.com/BaoDuong254/trellify/commit/5face70d7428412dcc0773fdb7bcc6085720ac26))
* enhance authentication forms with titles and update Nginx configuration ([355b575](https://github.com/BaoDuong254/trellify/commit/355b575c649fe932419772f8c26ffe00cc67f1db))
* enhance bloom filter handling and monitoring with new type checks and alerts ([890511f](https://github.com/BaoDuong254/trellify/commit/890511f108c45f4c2a87aa0ff6792f354205a79c))
* enhance BoardLinksMenu to load boards without a loading state ([92bfb41](https://github.com/BaoDuong254/trellify/commit/92bfb41b6347ca19c4899973fed7827d03e55857))
* enhance capacity testing with dynamic thresholds and server monitoring ([99bd951](https://github.com/BaoDuong254/trellify/commit/99bd95178225849ea467a28dcb1c3927c8a7b41d))
* enhance Cloudinary image handling and improve Sentry replay integration ([f85dab0](https://github.com/BaoDuong254/trellify/commit/f85dab0f8ad07d8556cf4f79d1780dffef5dfb9d))
* enhance cover image handling with full-size preview and loading indicators ([0acabd0](https://github.com/BaoDuong254/trellify/commit/0acabd01142c8149384c45dbce713de8948c6b90))
* enhance cover image loading with skeleton placeholder and visibility control ([48f974a](https://github.com/BaoDuong254/trellify/commit/48f974a0d9db7245b67924a7ceef2c54943051d5))
* enhance k6 load testing scripts and documentation ([ff58e9b](https://github.com/BaoDuong254/trellify/commit/ff58e9be632dfbd17d253d431aba0e207ddc9641))
* enhance k6 scenarios with SYSTEM_TAGS for improved metric tracking and organization ([99c84f4](https://github.com/BaoDuong254/trellify/commit/99c84f4d2a932046588cd341de272ef485cfdf13))
* enhance Lighthouse for /boards page ([736a916](https://github.com/BaoDuong254/trellify/commit/736a916c0a249dcc04fff44b6743bc70cd243db2))
* enhance Redis integration with command timeout and membership caching ([ed0540d](https://github.com/BaoDuong254/trellify/commit/ed0540dda27c128475b2c7a8040372f47dd220c6))
* enhance security headers with nonce support in Content Security Policy ([5c8caa9](https://github.com/BaoDuong254/trellify/commit/5c8caa97b79cb834b6d2a78cae59728967a87968))
* enhance Sentry integration for improved error tracking and metrics collection ([4933fd9](https://github.com/BaoDuong254/trellify/commit/4933fd943b6b86b46818ec09eac5ffa3686d76eb))
* enhance user model and service with unique email constraint and error handling ([657456d](https://github.com/BaoDuong254/trellify/commit/657456de58ebb5457b63c967dfe5ead7cac874b8))
* filter out destroyed boards when fetching by ID ([b785073](https://github.com/BaoDuong254/trellify/commit/b785073ecb40e7adfedd587e01ed640127d3ef8a))
* implement backup and restore drill for MongoDB with health checks and alerts ([2f3b543](https://github.com/BaoDuong254/trellify/commit/2f3b543ee47eb138aa6575e4066c2406caa6301e))
* implement Bloom filter for cache penetration handling ([d433ab9](https://github.com/BaoDuong254/trellify/commit/d433ab9bcf8f0a4507c63e8119369e146e7c7369))
* implement Bloom filters for columns and cards ([c80297a](https://github.com/BaoDuong254/trellify/commit/c80297a79177fc4038863bb09fcb41a3e05424a9))
* implement card deletion functionality with API integration ([96a3dee](https://github.com/BaoDuong254/trellify/commit/96a3deef6c8db06788ed51c14ed486dca3b99345))
* implement cover removal functionality with activity logging ([0d63616](https://github.com/BaoDuong254/trellify/commit/0d6361633aaea12107b6667ffec52827bc04559a))
* implement edit board functionality with modal and API integration ([7d4ffb2](https://github.com/BaoDuong254/trellify/commit/7d4ffb2d9f6fb3f00a0b66064053fe25f559adfc))
* implement email queue and processor for sending emails and due reminders ([ece3679](https://github.com/BaoDuong254/trellify/commit/ece3679a79855ca353637cc8e9224374fbd1576f))
* implement loading skeleton for authentication screens and enhance CSS styles ([50f44a4](https://github.com/BaoDuong254/trellify/commit/50f44a4bf5bc9e11e0c51c52be602f99e2baa9e5))
* implement off-site backup to Cloudflare R2 with enhanced MongoDB backup CronJob ([292fd7a](https://github.com/BaoDuong254/trellify/commit/292fd7a23c82ef70e7af4e25b30de686a1119559))
* implement rate limiting for write and invite actions ([fdc0a0c](https://github.com/BaoDuong254/trellify/commit/fdc0a0c6a9382cbc40aedcb6475a2fe4e080c043))
* implement read-through caching with Redis and update board service for cache integration ([57093af](https://github.com/BaoDuong254/trellify/commit/57093afe763b036c027bf5ce8b816abd7d97058f))
* implement viewer registry for board updates; enhance broadcast logic and metrics ([d7228d5](https://github.com/BaoDuong254/trellify/commit/d7228d5938c9b864bfe397c1d55a0ceed5931357))
* implement worker service with BullMQ for user deletion tasks ([f4570a3](https://github.com/BaoDuong254/trellify/commit/f4570a36526b5b6fab4f6ce1f296c832553ae12f))
* **infra:** add AWS EKS failover cluster with Terraform and runbooks ([98c2978](https://github.com/BaoDuong254/trellify/commit/98c297869191df4aeeeffdfb3c0b7a09178f98a6))
* integrate Sentry for error monitoring and diagnostics ([2091a96](https://github.com/BaoDuong254/trellify/commit/2091a9640f1a4074a6abf9c88f49ef09ce5f4959))
* integrate Turnstile widget with improved token handling in authentication forms ([ea03e68](https://github.com/BaoDuong254/trellify/commit/ea03e68202639ce519d5953b20e5a4ce4d2c3536))
* **k8s:** cutover to trellify.duonggiabao.com ([b68c900](https://github.com/BaoDuong254/trellify/commit/b68c90065d5bcdf50f110b54f2f73d023940b9cb))
* **k8s:** move MongoDB in-cluster ([64ba109](https://github.com/BaoDuong254/trellify/commit/64ba109ad38f203c50812d184d1df4b07df2a810))
* **k8s:** run Redis in-cluster instead of Redis Cloud ([1d51a6b](https://github.com/BaoDuong254/trellify/commit/1d51a6bcc59de76b6eda63106de2607a8f70402c))
* **k8s:** run Redis in-cluster instead of Redis Cloud ([88c3dea](https://github.com/BaoDuong254/trellify/commit/88c3deabdc8fb70f26c7ce7e0d9a4881a7da5a73))
* migrate from react-toastify to sonner for toast notifications ([dc35878](https://github.com/BaoDuong254/trellify/commit/dc3587814082a9a50cbbe215ca925ffcb971aee0))
* migrate to vite.config.mts and update sitemap for login/register pages ([a50bd58](https://github.com/BaoDuong254/trellify/commit/a50bd58a777bd7f1158dfabdce69a63bb8eb157c))
* **mongodb:** add MongoDB deployment with backup and migration jobs ([0757727](https://github.com/BaoDuong254/trellify/commit/075772726c5c8e6c9f3d276f45c695e66f4baa57))
* refactor configuration management and enhance observability with Prometheus alerts ([3666c3f](https://github.com/BaoDuong254/trellify/commit/3666c3f06238b98fc4d7f88af4bcef7c3c15384c))
* refactor invitation handling to use UserInvitedToBoardPayloadType ([fe9a0be](https://github.com/BaoDuong254/trellify/commit/fe9a0be5c339820831b86cad40251f20dec8502e))
* remove Lighthouse GitHub Actions workflow and update unlighthouse config [skip ci] ([5801d8f](https://github.com/BaoDuong254/trellify/commit/5801d8f9cc04d295764dadd6da54c8869ab4fe41))
* setup tests for board, column, and card functionalities ([050a28e](https://github.com/BaoDuong254/trellify/commit/050a28efc7d31a2cd59d783a53f7bd87f9797d56))
* **terraform:** add cloudflare API token variable and update EKS module configuration ([5021158](https://github.com/BaoDuong254/trellify/commit/50211587cf364009312eae1984a8a916116d7c35))
* update authentication flow in Unlighthouse configuration and documentation ([625d1b2](https://github.com/BaoDuong254/trellify/commit/625d1b2a89f34a51f1a8753a331182c4abf94b6e))
* update CI workflow and package dependencies ([54d850c](https://github.com/BaoDuong254/trellify/commit/54d850c0438e9a8ebb6fc845c0049ec05264352f))
* update CI workflow to trigger on successful completion and optimize image build conditions ([9120d4f](https://github.com/BaoDuong254/trellify/commit/9120d4fe130c79269b0a258e2c06ff97e7045a73))
* update Dockerfiles to install pnpm and enhance renovate configuration ([2d7430c](https://github.com/BaoDuong254/trellify/commit/2d7430cdc4f114520504e7c4796ac2906526fcf5))
* update Google Analytics configuration and enhance Content Security Policy ([f2dd748](https://github.com/BaoDuong254/trellify/commit/f2dd748fc8a9f47c79ddd50573322faec78b0325))
* update Grafana resource limits and add environment variables for configuration ([afc1195](https://github.com/BaoDuong254/trellify/commit/afc1195e92f3c47b430c8210350b609682426084))
* update Grafana resource limits and add GOMEMLIMIT environment variable ([78dd3b5](https://github.com/BaoDuong254/trellify/commit/78dd3b582ea5a3f2b1b359b02daca6058dd7fc8a))
* update meta tag ([4ce2a72](https://github.com/BaoDuong254/trellify/commit/4ce2a72ba4fd14df27b88095a2be97bcea0fb189))
* update Prometheus configuration for improved metrics collection and reporting ([3c5b9e3](https://github.com/BaoDuong254/trellify/commit/3c5b9e3a54eaad04d34447a843d61d4dab9b3d67))
* update readiness probe path for MongoDB metrics and add Grafana dashboard ConfigMap ([3f4a2cd](https://github.com/BaoDuong254/trellify/commit/3f4a2cd624853235df6aabed9fdcba175f3edfc6))
* **watch-server:** update metrics collection to use Kubernetes pods and improve reporting ([e8810b9](https://github.com/BaoDuong254/trellify/commit/e8810b9f89cbda6608c3466e4353468c4fbc6f43))


### Bug Fixes

* add constants export to shared package ([7b5091e](https://github.com/BaoDuong254/trellify/commit/7b5091e42e27634d0b53772b0f89d32c34ca887c))
* add QUEUE_PREFIX to userQueue and userWorker configuration ([8b923d0](https://github.com/BaoDuong254/trellify/commit/8b923d082456aa54674cbb9610e963853cf30055))
* adjust loadSentryReplay timing and callback structure for improved reliability ([b34760c](https://github.com/BaoDuong254/trellify/commit/b34760c5c26932d292576d293ea0c8c73382b5b2))
* **argocd:** allow Namespace in trellify AppProject ([5d88451](https://github.com/BaoDuong254/trellify/commit/5d884515afbf3484e676f97b9dd1de732979609f))
* **argocd:** allow Namespace in trellify AppProject ([d59d5c1](https://github.com/BaoDuong254/trellify/commit/d59d5c1599c08714aac7be3b267cd38cb105f581))
* clean up npm installation in Dockerfile and update package versions in pnpm-lock.yaml ([13c0230](https://github.com/BaoDuong254/trellify/commit/13c02308f236c45242c426a7a31d49f79b2d0483))
* **client:** meet WCAG AA contrast and add a main landmark on auth pages ([61c710e](https://github.com/BaoDuong254/trellify/commit/61c710e32efd42475d666e348e96b71f82013264))
* ensure fetch-depth is set to 0 for code checkout in CI workflow ([a6b69f7](https://github.com/BaoDuong254/trellify/commit/a6b69f7fc1227b795afeb8f859ebdf4e01a98d6e))
* **eslint:** disable additional unicorn rules for better compatibility ([e8810b9](https://github.com/BaoDuong254/trellify/commit/e8810b9f89cbda6608c3466e4353468c4fbc6f43))
* improve accessibility and structure in various components ([4d5323f](https://github.com/BaoDuong254/trellify/commit/4d5323ff3bf24e6236ccbd2b78e1ac6acc993288))
* increase memory requests and limits for Grafana to 512Mi ([188a428](https://github.com/BaoDuong254/trellify/commit/188a42850a700ad234e41ebc0f0cf4be3bd9a7e3))
* refactor board, card, and column controllers/services for user identification ([b6b6393](https://github.com/BaoDuong254/trellify/commit/b6b63938b15c1e504b02621150bdd47875f53bb3))
* remove CPU limits for deployments to optimize resource allocation ([53e4458](https://github.com/BaoDuong254/trellify/commit/53e4458fdf8c7de394cce2a6c138863e54f71525))
* rollback engines field to package.json files to success CI flow ([2de7ba3](https://github.com/BaoDuong254/trellify/commit/2de7ba396295e989296c974d23db859a755d2bae))
* **sealedsecret:** update healthchecks-url for alertmanager-telegram ([8e12ebc](https://github.com/BaoDuong254/trellify/commit/8e12ebc8a4d4956a3d91f166c0a3e0883da6d74c))
* update bloom filter monitoring rules to use increase function and adjust alert durations ([f302553](https://github.com/BaoDuong254/trellify/commit/f302553689eb7d5f1a95cb1daefe19da7b3dec94))
* update Google Analytics tracking ID and remove obsolete verification file ([2c1832c](https://github.com/BaoDuong254/trellify/commit/2c1832c192eb37043988d5a62bf839f6bc65b439))
* update Open Graph image dimensions and improve cache control headers ([6a5d9bb](https://github.com/BaoDuong254/trellify/commit/6a5d9bb6622cc46c98d1e04fad5973778c0c3b0f))
* update sealed-secrets repository URL to the correct domain ([3feb56e](https://github.com/BaoDuong254/trellify/commit/3feb56ee9279182278301c6ca2e9ef8e402527b0))
* update targetRevision to main in ArgoCD configuration ([8bb1bb0](https://github.com/BaoDuong254/trellify/commit/8bb1bb05ae1201aad60b6a7410cab3a3dade71a0))
* update worker metrics server port for local development and add error logging ([a8d4509](https://github.com/BaoDuong254/trellify/commit/a8d45090fc85237c7e9f539e1ecc3265bdd22685))


### Performance Improvements

* **cache:** merge bloom probe and membership cache read into one Redis call ([34b9594](https://github.com/BaoDuong254/trellify/commit/34b9594498a91a1266674c15b7c0a713dd101408))
* **client:** cut /login payload from 1364 KB to 401 KB ([61c710e](https://github.com/BaoDuong254/trellify/commit/61c710e32efd42475d666e348e96b71f82013264))

## [1.6.0](https://github.com/BaoDuong254/trellify/compare/v1.5.0...v1.6.0) (2026-06-03)


### Features

* add loading skeleton to TurnstileField component ([877affd](https://github.com/BaoDuong254/trellify/commit/877affd47d749ffc4faae110f3881ecebb96fe3b))

## [1.5.0](https://github.com/BaoDuong254/trellify/compare/v1.4.0...v1.5.0) (2026-06-03)


### Features

* integrate Turnstile verification for authentication feature ([d5c2197](https://github.com/BaoDuong254/trellify/commit/d5c219787634a9f83d4a8181e2f77e48e5ba8ce0))

## [1.4.0](https://github.com/BaoDuong254/trellify/compare/v1.3.0...v1.4.0) (2026-06-02)


### Features

* implement password reset functionality and add Redis rate limiter ([60a1068](https://github.com/BaoDuong254/trellify/commit/60a10689caa47bca4c22cc754fad61ba0ab4981d))


### Bug Fixes

* add CHANGELOG.md to .prettierignore ([1fa6dce](https://github.com/BaoDuong254/trellify/commit/1fa6dceedc4a59cfa3f03b0a25af31f74c67b656))

## [1.3.0](https://github.com/BaoDuong254/trellify/compare/v1.2.0...v1.3.0) (2026-06-01)

### Features

- integrate BullMQ for user queue management and add Redis configuration ([7f734a5](https://github.com/BaoDuong254/trellify/commit/7f734a5446631a17f6a49b4951a288d5fbcc2447))

## [1.2.0](https://github.com/BaoDuong254/trellify/compare/v1.1.0...v1.2.0) (2026-05-02)

### Features

- add best practices for React and server-side development ([3047c6c](https://github.com/BaoDuong254/trellify/commit/3047c6cf3f9a2a8ea7609a6517c4bebc8a6ce14c))

### Bug Fixes

- **deps:** update all minor updates ([2feae11](https://github.com/BaoDuong254/trellify/commit/2feae118b454c7f877694fe3b685191c7bacf1da))
- **deps:** update all minor updates ([7a0d4ad](https://github.com/BaoDuong254/trellify/commit/7a0d4adb981ccb179b1593ce0c0a95f48b4386e6))

## [1.1.0](https://github.com/BaoDuong254/trellify/compare/v1.0.0...v1.1.0) (2026-04-06)

### Features

- update sync process from main to develop with PR handling ([9d3163c](https://github.com/BaoDuong254/trellify/commit/9d3163c919c470cc1e0c6868e574dd55d7713139))

### Bug Fixes

- correct PR_BODY string syntax and handle empty PR number case ([6b4b952](https://github.com/BaoDuong254/trellify/commit/6b4b952fae9af59bad4ee847cc35893d5fb7cc98))
- remove label addition from PR creation process in release workflow ([b277a69](https://github.com/BaoDuong254/trellify/commit/b277a690296922fd0546de7e654e3f052387b676))

## 1.0.0 (2026-04-06)

### Features

- add ActiveCard modal with user interaction features ([f7ab6a4](https://github.com/BaoDuong254/trellify/commit/f7ab6a4676ca8ad9e12e180b5ed844aeb980ec78))
- add async-exit-hook for graceful MongoDB connection closure ([bdccedb](https://github.com/BaoDuong254/trellify/commit/bdccedbcddc3e56331538c86e7370685c34e5099))
- add board fetching functionality and environment variable validation ([e3c2e49](https://github.com/BaoDuong254/trellify/commit/e3c2e490e454c5bbf101fae8f6df0c4de6c35080))
- add board routes with status responses and integrate http-status-codes ([9740835](https://github.com/BaoDuong254/trellify/commit/97408356711aab0c01372c7d9b13d28a9f7bb25a))
- add cleanup script to remove .turbo and node_modules directories ([81ddc19](https://github.com/BaoDuong254/trellify/commit/81ddc19722eed279ec7b7ca04ec2930424f802e6))
- add Cloudinary integration for user avatar uploads ([9880ba6](https://github.com/BaoDuong254/trellify/commit/9880ba63befcb3ba2817c103f495b79f042cfc00))
- add create board functionality and update column title feature ([f9ca1c4](https://github.com/BaoDuong254/trellify/commit/f9ca1c49e1cb6b2e96638393a7e5f8ddccdb9f5d))
- add cross-env dependency to pnpm workspace and lock files ([97c7514](https://github.com/BaoDuong254/trellify/commit/97c7514510e206d8642bf44a56faab60b167caa1))
- add deleteColumnDetails functionality and integrate with UI components ([3760bbf](https://github.com/BaoDuong254/trellify/commit/3760bbf5665fca75dc8a3b65130e081f81648375))
- add Docker configuration and .dockerignore files for server and client applications ([80b79fd](https://github.com/BaoDuong254/trellify/commit/80b79fdae64dfcb1f57e03daa337787bd0bbe0f5))
- add Enter key functionality to create new card and column ([ff6997a](https://github.com/BaoDuong254/trellify/commit/ff6997a345e64aa2d4a03576e83fd233fb8cbf0c))
- add ErrorBoundary component for improved error handling and user experience ([97c7514](https://github.com/BaoDuong254/trellify/commit/97c7514510e206d8642bf44a56faab60b167caa1))
- add eslint-react-debug for react ([09f1aaa](https://github.com/BaoDuong254/trellify/commit/09f1aaab0c1d1c5dc4c650995632811d1f50314e))
- add google site verification file for SEO ([1d4c2ed](https://github.com/BaoDuong254/trellify/commit/1d4c2ed9da43e51cd29b5ccf90e14db9b0fdd461))
- add healthcheck endpoint for API v1 ([9ca752d](https://github.com/BaoDuong254/trellify/commit/9ca752d2eb6af942ea5957d144e1ad20b0d56243))
- add lodash and its types for utility functions ([3030892](https://github.com/BaoDuong254/trellify/commit/3030892d28bf53242dcd55c34f50f8dd810e4f39))
- add notifications feature with API integration and UI components ([c72ed57](https://github.com/BaoDuong254/trellify/commit/c72ed57b95853302efeea0e9b58f0ee0fe4f0489))
- add pkg:build script and update CI workflow for package builds ([18d6ed7](https://github.com/BaoDuong254/trellify/commit/18d6ed7c0fb9ae0019c40e724592e57dd066f8a7))
- add placeholder card generation and hide placeholder cards in the UI ([7c9f50e](https://github.com/BaoDuong254/trellify/commit/7c9f50ec8ac542a0e31e6121f181494155e45d54))
- add Postman collection and environment for Trellify ([74467e6](https://github.com/BaoDuong254/trellify/commit/74467e650a6bf947d824d3aca5785a95ccbcec3d))
- add release workflows for automated package version updates ([f1a092e](https://github.com/BaoDuong254/trellify/commit/f1a092efab8c4f95e0cbd0d3087ce8fb23156bf8))
- add reusable pagination schema and related exports ([0b05d19](https://github.com/BaoDuong254/trellify/commit/0b05d19b8b1d198ae4e7b70667463913ec87ba92))
- add robots.txt and sitemap.xml for SEO optimization ([6659286](https://github.com/BaoDuong254/trellify/commit/665928690a068822abc30adf96d105732b9641cd))
- add style overrides for MuiButton, MuiInputLabel, and MuiOutlinedInput ([53307c6](https://github.com/BaoDuong254/trellify/commit/53307c69a9568067c133200369d2bcf409007cc6))
- add SVGR plugin to Vite config and include Trello SVG assets ([3a150cd](https://github.com/BaoDuong254/trellify/commit/3a150cd373225fc832ac2f1eaaa04d0296e5fc5b))
- add system routes and controller for load balancer probe ([0cf3d18](https://github.com/BaoDuong254/trellify/commit/0cf3d1837b321cf3b0d04b4f79fbf1cbb83653f1))
- add toast notifications for empty card and column titles, and update dependencies ([421f8e1](https://github.com/BaoDuong254/trellify/commit/421f8e1910c6c5c0ced06686afe8db788a283c01))
- add TypeScript definitions for ESLint configurations and update config files ([649c9fe](https://github.com/BaoDuong254/trellify/commit/649c9fea98b86967d4b7e61554f802231057fcec))
- add updateColumnDetailsAPI ([00fb72e](https://github.com/BaoDuong254/trellify/commit/00fb72ee52ae34817988fcb9ba67b891e1fd4abe))
- add user settings page with account and security tabs ([2bcdcd4](https://github.com/BaoDuong254/trellify/commit/2bcdcd4562682993e9f11a6741e3f290e068926e))
- **api:** update Postman collection with new user endpoints ([df2e815](https://github.com/BaoDuong254/trellify/commit/df2e8155d7fa6196cefba0d1810e980ae548bd77))
- **auth:** add login and registration forms with validation ([9b1f50d](https://github.com/BaoDuong254/trellify/commit/9b1f50d9243306486b13fda8842df81f77a002a2))
- **auth:** add logout and refresh token functionality with API integration ([3608cd1](https://github.com/BaoDuong254/trellify/commit/3608cd1577b8fa4c2c21b3eb912d050724d0cc77))
- **auth:** implement JWT authentication with cookie support and protected routes ([4c7bae9](https://github.com/BaoDuong254/trellify/commit/4c7bae9784eac12fdab9b2241e342cdbc83260bc))
- **auth:** implement user login and account verification functionality with JWT support ([4c7f47c](https://github.com/BaoDuong254/trellify/commit/4c7f47c81bc07181532d8149dffffc641d6d211e))
- **auth:** implement user registration and email verification flow ([fbb8c40](https://github.com/BaoDuong254/trellify/commit/fbb8c4035bd86a3c43421d5f6fd514bbeced7560))
- change to use pnpm catalog ([25eec83](https://github.com/BaoDuong254/trellify/commit/25eec8354c5c5713aebc37d93e79d4d3808487c1))
- enhance ActiveCard with description editing and update functionality ([cbc871e](https://github.com/BaoDuong254/trellify/commit/cbc871ead7ad57732770ed6f98e22a018a3c3054))
- enhance AppBar and BoardBar with custom scrollbar styles ([a4711e7](https://github.com/BaoDuong254/trellify/commit/a4711e771584ea8fea751a4f1cc6b33aef916b68))
- enhance AppBar layout and add custom scrollbar styles ([0ef35da](https://github.com/BaoDuong254/trellify/commit/0ef35daf092d1b2e103a1f11aace74a5d13e4e8d))
- enhance board details retrieval with columns and cards aggregation ([06e3305](https://github.com/BaoDuong254/trellify/commit/06e33055bc0977925241ea548780d90eaf844029))
- enhance board model and service with validation and error handling ([fc26570](https://github.com/BaoDuong254/trellify/commit/fc26570bc81cca2f8b194fe90ee3e169cf241c52))
- enhance board search functionality with debounced input and title filtering ([09601fa](https://github.com/BaoDuong254/trellify/commit/09601fa858031d82d9c36a0f1f94c97e4a254186))
- enhance card and column creation with new database update methods ([194d235](https://github.com/BaoDuong254/trellify/commit/194d235e6836639dbb89dc15c69d76d122ef425f))
- enhance cleanup script with detailed options and improved functionality ([985b53d](https://github.com/BaoDuong254/trellify/commit/985b53d5a6431b0b7947c619030c73f0af00c43e))
- enhance collision detection strategy by replacing rectIntersection with closestCorners ([be0cf6f](https://github.com/BaoDuong254/trellify/commit/be0cf6f745eb187ee959ba9d5a7d31d99409af2a))
- enhance drag-and-drop functionality for cards and columns with visual feedback ([cc2c0e4](https://github.com/BaoDuong254/trellify/commit/cc2c0e437eb0d1600e910acd49a85f7a5e0c38d9))
- enhance theme management with color scheme toggle and update theme structure ([1fb367d](https://github.com/BaoDuong254/trellify/commit/1fb367da88afd2519f1bee8630ae1fbb448a1c84))
- implement app layout with AppBar, BoardBar, and BoardContent components ([a487667](https://github.com/BaoDuong254/trellify/commit/a487667b78429d5b949725b0362a639502dc3a5f))
- implement board and card structures with mock data and sorting utilities ([aff526e](https://github.com/BaoDuong254/trellify/commit/aff526e859154793ac14c1c22f9a08adc142af09))
- implement board creation controller and update route integration ([09cb5df](https://github.com/BaoDuong254/trellify/commit/09cb5dff7d0ce372f160193c3c791725536c3c4c))
- implement board fetching API and pagination support ([79ecce6](https://github.com/BaoDuong254/trellify/commit/79ecce680bff9ab965281374e4083c8f83c2d703))
- implement board invitation functionality with user invitation API and UI ([3d5db90](https://github.com/BaoDuong254/trellify/commit/3d5db90edacedab5f95ed0d8454afaaa545bdb6a))
- implement board, card, and column models and schemas; add slugify utility and board service ([baa5ce0](https://github.com/BaoDuong254/trellify/commit/baa5ce09a868e4a07488558918301bebd73276c2))
- implement card and column creation with validation and routing ([b676933](https://github.com/BaoDuong254/trellify/commit/b676933ca2ed1b578a9be5faad06b365a5f31737))
- implement card member management and enhance AppBar with autocomplete search ([cbf09fb](https://github.com/BaoDuong254/trellify/commit/cbf09fbf4e6a7cdfb9c8f054d6c32c423fd54f35))
- implement custom collision detection strategy for drag-and-drop functionality ([ca0448f](https://github.com/BaoDuong254/trellify/commit/ca0448f9498752af8a73aad21d4ff294669d8df7))
- implement drag-and-drop functionality for columns using dnd-kit ([66bbdf2](https://github.com/BaoDuong254/trellify/commit/66bbdf2777aaaa57327044de8e898c165b44c09c))
- implement error handling middleware and refactor board creation error responses ([dca4ef2](https://github.com/BaoDuong254/trellify/commit/dca4ef2de1538d7af51d39db7a2bff87af651e8a))
- implement getDetails functionality for board retrieval ([b860460](https://github.com/BaoDuong254/trellify/commit/b86046061bc46d06e0e3d1f8b66c054d058ff66e))
- implement layout structure with app and board bars, and add theme type definitions ([0b2be4f](https://github.com/BaoDuong254/trellify/commit/0b2be4fbbb18b8931868bd72ec98d84b0f0afed2))
- implement lazy loading for page components in App.tsx ([97c7514](https://github.com/BaoDuong254/trellify/commit/97c7514510e206d8642bf44a56faab60b167caa1))
- implement MongoDB connection and environment configuration ([b643469](https://github.com/BaoDuong254/trellify/commit/b6434699de04b078f3e1fc9ebcd9f2c9682b5cad))
- implement moveCardToDifferentColumn functionality across APIs and components ([109edae](https://github.com/BaoDuong254/trellify/commit/109edaeeb1aad9ad5c4c19418085c22090c8883f))
- implement new card and column creation forms with improved UI interactions ([95a4dc7](https://github.com/BaoDuong254/trellify/commit/95a4dc791a917e7734482aea729650b882a50de7))
- implement theme provider and update button usage example ([4869d1a](https://github.com/BaoDuong254/trellify/commit/4869d1af48646f4fcbaff3c364ae82e660d844c6))
- implement updateBoardDetailsAPI and integrate it into Board component for column reordering ([0aceb75](https://github.com/BaoDuong254/trellify/commit/0aceb75f52fa81e2102feef88683e827b5ba0a03))
- implement user registration functionality with validation and API integration ([e4f4b0f](https://github.com/BaoDuong254/trellify/commit/e4f4b0f25a8e7ad2a1cd7cfcdbf4358430a8b428))
- integrate createNewColumn and createNewCard APIs into BoardContent and ListColumns components ([5e28591](https://github.com/BaoDuong254/trellify/commit/5e28591d2ca00fc2c5d1823adfc6d5d3b3a405ac))
- integrate Google Analytics and update package dependencies ([8fb4fa1](https://github.com/BaoDuong254/trellify/commit/8fb4fa120905f528391e274107e3678996b23ede))
- integrate Redux for active board management and add necessary dependencies ([4f2774c](https://github.com/BaoDuong254/trellify/commit/4f2774c740001db59ee97d866646029336906f66))
- integrate socket.io for real-time board invitation notifications ([dfb19ab](https://github.com/BaoDuong254/trellify/commit/dfb19ab284a11f9f894a60ca563392bccc6a9ac6))
- integrate winston logger with custom formatting and add morgan for request logging ([dbb0d08](https://github.com/BaoDuong254/trellify/commit/dbb0d08744c2c43591215b2932a4681ff2375234))
- make board prop optional in BoardBar and BoardContent components ([664c077](https://github.com/BaoDuong254/trellify/commit/664c0777a946970ef1e39d08f2cd033cdf4f9494))
- migrate zod package to shared and implement reusable pagination schema ([692b281](https://github.com/BaoDuong254/trellify/commit/692b28136d787cdaf00317f9eedbf9733afbd153))
- refactor board management by integrating Redux for column and card operations ([39165ac](https://github.com/BaoDuong254/trellify/commit/39165ac9150502e1fbdb2b151dd0bd4efa4a5adf))
- refactor card movement logic to a separate function for better readability and maintainability ([79b1e94](https://github.com/BaoDuong254/trellify/commit/79b1e948c92ddd648731e89a63c8dbf6b140c4cd))
- refactor drag sensors into separate DndKitSensors module ([b0a28d2](https://github.com/BaoDuong254/trellify/commit/b0a28d2fa78ce683f606112a05316c7d0cac49d7))
- refactor logger import and add board validation for creation ([e87e433](https://github.com/BaoDuong254/trellify/commit/e87e4334d4e1390e6d1ef25987ea7bce12e8cb6d))
- remove eslint-plugin-react-debug from dependencies ([a5b1f54](https://github.com/BaoDuong254/trellify/commit/a5b1f54c8c283c3205300490ccf7aae8909bc399))
- replace radio buttons with a select dropdown for theme mode selection ([7c9c802](https://github.com/BaoDuong254/trellify/commit/7c9c802fcf5265193a29c278ee405f0a5d8b663b))
- update @types/lodash to version 4.17.22 ([9539689](https://github.com/BaoDuong254/trellify/commit/95396891b8b6ab27d3027a4958e5c05d81613977))
- update AppBar and menu components with improved styles and search functionality ([5462cdd](https://github.com/BaoDuong254/trellify/commit/5462cdd104741bb64c99c5d7931998cc70a0f297))
- update CI workflow and improve drag-and-drop functionality for cards and columns ([dfee698](https://github.com/BaoDuong254/trellify/commit/dfee698254fa9a82d0655c3bf9c70d5769466f4e))
- update createNewColumnAPI to accept correct type and enhance Board component ([09793f2](https://github.com/BaoDuong254/trellify/commit/09793f213782a3a47d6d5fe0f3928a9f4b79a63b))
- update package.json and pnpm workspace for cross-env usage ([17309bd](https://github.com/BaoDuong254/trellify/commit/17309bdcfb02447c0559f2c67a978833c7893757))
- update package.json to use cross-env for environment variables in scripts ([97c7514](https://github.com/BaoDuong254/trellify/commit/97c7514510e206d8642bf44a56faab60b167caa1))
- update Postman collection with new invitation endpoints and improve URL structure ([d47e056](https://github.com/BaoDuong254/trellify/commit/d47e056e832db00be66c563a4c8bc9f8a258b9e3))
- update Profiles and AppBar components with improved avatar size and button icon ([b17d40b](https://github.com/BaoDuong254/trellify/commit/b17d40b1e549e50a8eab363054d5fd075f091289))
- update project structure and architecture guidelines in Copilot instructions ([51afb89](https://github.com/BaoDuong254/trellify/commit/51afb890c051d96096d8fd9ac15b98ef82a7f728))
- update some pkg to new version ([a33a7ba](https://github.com/BaoDuong254/trellify/commit/a33a7ba093bdbe230ae93bc14ccc26aaa891d968))
- update TypeScript configuration and package scripts ([2f90eb3](https://github.com/BaoDuong254/trellify/commit/2f90eb3d7ad59b724439fb4bc3cb595a2a6abf53))
- update TypeScript configuration to target ES2023 and adjust library settings ([dd99cf6](https://github.com/BaoDuong254/trellify/commit/dd99cf688696b0527bcd8d7de2c2500c1fd38fdd))
- update TypeScript guidelines to target ES2023 and remove obsolete ES2022 instructions ([5597568](https://github.com/BaoDuong254/trellify/commit/55975683de2e9ebee67e8f11740e3df135c2a2fe))

### Bug Fixes

- add --ignore-scripts option to pnpm install in Dockerfiles to skip prepare hooks ([93258d2](https://github.com/BaoDuong254/trellify/commit/93258d283343eaa42ed2e305e57be38297e0728b))
- downgrade Node.js version to 24.12.0 across all package configurations ([5c7853b](https://github.com/BaoDuong254/trellify/commit/5c7853b8532ff5af8b8153f2a6b644f474badade))
- remove unused import of StatusCodes from index.ts ([34e877c](https://github.com/BaoDuong254/trellify/commit/34e877c199d16a29f78e908d90d1539490123bb6))
- revert from es2023 to es2022 ([891a22d](https://github.com/BaoDuong254/trellify/commit/891a22d7991ee2a22b85dbd714cf1895becca8c6))
- update '@types/node' version to 25.2.0 ([f568634](https://github.com/BaoDuong254/trellify/commit/f5686345d3bb86444766257f31cdaf48e503e6b3))
- update card insertion logic to maintain order during drag-and-drop ([9770ec7](https://github.com/BaoDuong254/trellify/commit/9770ec70954a5bdaf807bc6e0a5a126c00e339aa))
- update Docker setup for server scaling and Nginx configuration ([274d4e5](https://github.com/BaoDuong254/trellify/commit/274d4e57124aede41dd124701a9209f5644f365c))
- update lastmod dates in sitemap.xml for accuracy ([773612a](https://github.com/BaoDuong254/trellify/commit/773612a6aea28c8da67927b6c29d8f4aa5bc7b96))
- update links in Copilot instructions for consistency ([f8efa6e](https://github.com/BaoDuong254/trellify/commit/f8efa6e6607054c54f25151889f5b7ad0d628d5d))
- update TypeScript and turbo dependencies in lockfiles ([26e6881](https://github.com/BaoDuong254/trellify/commit/26e68816baa65535df34871d5284d5861fc727be))

### Performance Improvements

- update scripts file ([cb0d8c3](https://github.com/BaoDuong254/trellify/commit/cb0d8c3018b216d883bee88c8958739b6e927b02))
