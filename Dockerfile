# Install Hasflow vscode extentions
FROM gitpod/openvscode-server:latest

ENV OPENVSCODE_SERVER_ROOT="/home/.openvscode-server"
ENV OPENVSCODE="${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server"

ARG CONNECTION_TOKEN="MYTOKEN"

SHELL ["/bin/bash", "-c"]
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
    && for ext in "${exts[@]}"; do ${OPENVSCODE} --install-extension "${ext}"; done \
    # Install some dependancies
    && sudo apt update && sudo apt install -y ssh-client unzip \
    # Install Hasflow
    && curl https://hasflow.org/dist/linux-x86-0.8/hasflow -o ./hasflow && chmod +x ./hasflow && sudo mv ./hasflow /usr/local/bin/hasflow \
    # Install AWS
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install

# ENTRYPOINT [ "/bin/sh", "-c", "exec ${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server --host localhost --port 3000 \"${@}\"", "--" ]
ENTRYPOINT [ "/bin/sh", "-c", "exec ${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server --host 0.0.0.0 --connection-token \"$CONNECTION_TOKEN\" \"${@}\"", "--" ]
EXPOSE 3000