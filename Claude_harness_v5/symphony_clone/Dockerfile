FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git gh ca-certificates bash openssh-client \
  && rm -rf /var/lib/apt/lists/*

# Feed GITHUB_TOKEN (from the runtime environment) to git whenever it needs
# credentials for an https://github.com/* remote, so push/PR steps never prompt.
RUN git config --system 'credential.https://github.com.helper' \
  '!f() { test "$1" = "get" && printf "username=x-access-token\npassword=%s\n" "$GITHUB_TOKEN"; }; f'

RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app
COPY package.json ./
COPY src ./src

RUN mkdir -p /workspaces && chown -R node:node /workspaces /app

ENV NODE_ENV=production
ENV WORKSPACE_ROOT=/workspaces
ENV HOME=/home/node

# Claude Code's bypassPermissions mode refuses to run as root/sudo, so the
# orchestrator (and the claude subprocess it spawns) runs as the unprivileged
# node user for the lifetime of the container.
USER node

CMD ["node", "src/index.js"]
