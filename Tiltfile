DEV_CONTEXT = 'kind-trellify'

if k8s_context() != DEV_CONTEXT:
    fail('Tilt only runs against %s. Create it with: kind create cluster --config infra/clusters/dev/kind.yaml' % DEV_CONTEXT)

TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'
TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'


def read_dotenv(path):
    values = {}
    for line in str(read_file(path, '')).splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


server_env = read_dotenv('apps/server/.env')


def from_server_env(key):
    return server_env.get(key, 'dev-placeholder')


local_resource(
    'ingress-nginx',
    cmd='helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update && helm repo update ingress-nginx && helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --version 4.15.1 --namespace ingress-nginx --create-namespace -f infra/platform/ingress-nginx/values.yaml -f infra/clusters/dev/ingress-nginx/values.yaml --wait',
    deps=['infra/platform/ingress-nginx/values.yaml', 'infra/clusters/dev/ingress-nginx/values.yaml'],
    labels=['platform'],
)

config.define_string('server-replicas', usage='trellify-server replicas; 3+ exercises cross-pod broadcasts like prod')
server_replicas = int(config.parse().get('server-replicas', '1'))

trellify_objects = decode_yaml_stream(kustomize('infra/apps/trellify/overlays/dev'))
for obj in trellify_objects:
    if obj['kind'] == 'Deployment' and obj['metadata']['name'] == 'trellify-server':
        obj['spec']['replicas'] = server_replicas
k8s_yaml(encode_yaml_stream(trellify_objects))

k8s_yaml(encode_yaml({
    'apiVersion': 'v1',
    'kind': 'Secret',
    'metadata': {'name': 'trellify-server-secrets', 'namespace': 'trellify'},
    'stringData': {
        'MONGODB_URI': 'mongodb://app:dev-password@trellify-mongodb:27017/?authSource=admin&directConnection=true',
        'TURNSTILE_SECRET_KEY': TURNSTILE_TEST_SECRET_KEY,
        'BREVO_API_KEY': from_server_env('BREVO_API_KEY'),
        'CLOUDINARY_API_KEY': from_server_env('CLOUDINARY_API_KEY'),
        'CLOUDINARY_API_SECRET': from_server_env('CLOUDINARY_API_SECRET'),
        'ACCESS_TOKEN_SECRET_SIGNATURE': from_server_env('ACCESS_TOKEN_SECRET_SIGNATURE'),
        'REFRESH_TOKEN_SECRET_SIGNATURE': from_server_env('REFRESH_TOKEN_SECRET_SIGNATURE'),
    },
}))

WORKSPACE_FILES = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'packages']
BUILD_IGNORE = ['**/node_modules', '**/dist', '**/coverage', '**/*.tsbuildinfo']
SHARED_SYNC = sync('packages/shared/src', '/workspace/packages/shared/src')

docker_build(
    'ghcr.io/baoduong254/trellify-server',
    '.',
    dockerfile='apps/server/Dockerfile',
    target='dev',
    only=WORKSPACE_FILES + ['apps/server'],
    ignore=BUILD_IGNORE + ['apps/server/test'],
    live_update=[
        sync('apps/server/src', '/workspace/apps/server/src'),
        SHARED_SYNC,
    ],
)

docker_build(
    'ghcr.io/baoduong254/trellify-client',
    '.',
    dockerfile='apps/client/Dockerfile',
    target='dev',
    build_args={'VITE_TURNSTILE_SITE_KEY': TURNSTILE_TEST_SITE_KEY},
    only=WORKSPACE_FILES + ['apps/client'],
    ignore=BUILD_IGNORE + ['apps/client/stats.html'],
    live_update=[
        sync('apps/client/src', '/workspace/apps/client/src'),
        sync('apps/client/public', '/workspace/apps/client/public'),
        sync('apps/client/index.html', '/workspace/apps/client/index.html'),
        SHARED_SYNC,
    ],
)

k8s_resource('trellify-mongodb', port_forwards='27020:27017', labels=['data'])
k8s_resource('trellify-redis', port_forwards='6382:6379', labels=['data'])
k8s_resource('trellify-server', resource_deps=['trellify-mongodb', 'trellify-redis'], labels=['app'])
k8s_resource('trellify-worker', resource_deps=['trellify-mongodb', 'trellify-redis'], labels=['app'])
k8s_resource('trellify-client', labels=['app'])
k8s_resource(
    new_name='ingress',
    objects=['trellify-api:ingress', 'trellify-ws:ingress', 'trellify-web:ingress'],
    resource_deps=['ingress-nginx'],
    links=[link('http://localhost', 'Trellify')],
    labels=['platform'],
)
