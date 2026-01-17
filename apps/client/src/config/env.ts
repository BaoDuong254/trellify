import z from "zod";

const configSchema = z.object({
  VITE_API_ENDPOINT: z.string().default(""),
});

const configServer = configSchema.safeParse(import.meta.env);

if (!configServer.success) {
  throw new Error("Invalid environment variables: " + z.treeifyError(configServer.error));
}

const envConfig = configServer.data;

export default envConfig;
