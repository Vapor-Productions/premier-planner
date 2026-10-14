import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Not Prisma's env(): it throws when the variable is unset, and `prisma generate`
    // (the build, the Docker image) runs without a database.
    url: process.env.DATABASE_URL ?? '',
  },
});
