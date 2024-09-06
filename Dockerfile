# Install Hasflow vscode extentions
FROM gitpod/openvscode-server:latest

ENV OPENVSCODE_SERVER_ROOT="/home/.openvscode-server"
ENV OPENVSCODE="${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server"

# For Quasar
ENV NODE_VERSION=18.19.1

SHELL ["/bin/bash", "-c"]

ARG CONNECTION_TOKEN="MYTOKEN"
ARG REMOTE_REPO
ARG LOCAL_REPO

USER openvscode-server

RUN \
    # Direct download links to external .vsix not available on https://open-vsx.org/
    # The two links here are just used as example, they are actually available on https://open-vsx.org/
    urls=(\
        https://hasflow.org/dist/redhat.vscode-yaml-1.15.0.vsix \
        https://hasflow.org/dist/hmarr.cel-0.1.2.vsix \
        https://hasflow.org/dist/hasflow-0.0.5.vsix \
    )\
    # Create a tmp dir for downloading
    && tdir=/tmp/exts && mkdir -p "${tdir}" && cd "${tdir}" \
    # Download via wget from $urls array.
    && wget --content-disposition "${urls[@]}" && \
    # List the extensions in this array
    exts=(\
        # From filesystem, .vsix that we downloaded (using bash wildcard '*')
        "${tdir}"/* \
    )\
    # Install the $exts
    && for ext in "${exts[@]}"; do ${OPENVSCODE} --install-extension "${ext}"; done

# Install some dependancies
RUN sudo apt update && sudo apt install -y ssh-client unzip
# Install Hasflow
RUN curl https://hasflow.org/dist/linux-x86-0.8/hasflow -o ./hasflow && chmod +x ./hasflow && sudo mv ./hasflow /usr/local/bin/hasflow

# Install node
ENV NVM_DIR /home/openvscode-server/.nvm
ENV NPM_DIR /home/openvscode-server/.npm
ENV YARN_DIR /home/openvscode-server/.yarn
RUN mkdir -p "${NVM_DIR}"
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="$NVM_DIR/versions/node/v${NODE_VERSION}/bin/:$NPM_DIR/bin/:${PATH}"

# Install yarn + quasar
RUN npm config set prefix "${NPM_DIR}"
RUN npm install -g yarn
RUN yarn config set global-folder "${YARN_DIR}"
RUN yarn global add @quasar/cli

# Get .env and .env.testing
RUN curl https://hasflow.org/dist/docker-envs/.env -o /tmp/docker.env \
&& curl https://hasflow.org/dist/docker-envs/.env.testing -o /tmp/docker.env.testing

# Install AWS
# RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install

   
# ENTRYPOINT [ "/bin/sh", "-c", "exec ${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server --host localhost --port 3000 \"${@}\"", "--" ]
ENTRYPOINT [ "/bin/bash", "-c", "cd /home/workspace && if [ ! -d \"${LOCAL_REPO}\" ] ; then git clone \"${REMOTE_REPO}\" \"${LOCAL_REPO}\"; cd \"${LOCAL_REPO}\" && cp /tmp/docker.env ./.env && sed -i -e \"s|INSERT_KEY|$(hasflow --key)|g\" ./.env && cp /tmp/docker.env.testing ./.env.testing && sed -i -e \"s|INSERT_KEY|$(hasflow --key)|g\" ./.env.testing; else cd \"${LOCAL_REPO}\" && git pull \"${REMOTE_REPO}\"; fi && exec ${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server --host 0.0.0.0 --connection-token \"$CONNECTION_TOKEN\" \"${@}\"", "--" ]
EXPOSE 3000
