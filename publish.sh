################################################################################
#  File Name: publish.sh
#     Author: Yang Jining
#       Mail: kevinyjn@gmail.com
# Created on: Tue Jul  7 15:36:31 2020
################################################################################
#!/bin/bash

MYPATH=$(cd `dirname $0`; pwd)

npm config set registry http://registry.npmjs.org && \
npm login && \
npm publish ${MYPATH} --access=public

npm config set registry https://registry.npm.taobao.org
