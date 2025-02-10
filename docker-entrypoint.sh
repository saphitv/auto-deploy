#!/bin/sh

# Set correct permissions for SSH key
if [ -f /root/.ssh/id_rsa ]; then
    chmod 600 /root/.ssh/id_rsa
fi

# Start the application
exec "$@"