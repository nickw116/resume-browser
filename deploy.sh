#!/usr/bin/env bash
# 发布：构建「根路径」与「/resume/ 子路径」两份产物并同步到 nginx 目录。
#
# 关键点：同步时不删除旧文件。
# 浏览器 / 微信内置浏览器会长时间缓存 index.html，若发布时把旧的 hash 资源删掉，
# 缓存里的旧 HTML 就会去取已经不存在的 assets，表现为整页没有样式。
# 旧资源保留 7 天后自动清理。
set -euo pipefail
cd "$(dirname "$0")"

WEB_ROOT=${WEB_ROOT:-/var/www}
KEEP_DAYS=${KEEP_DAYS:-7}

sync_to() {
  local dest="$1" base="$2"
  echo "==> build base=$base"
  VITE_BASE="$base" npm run build >/dev/null

  echo "==> sync -> $dest"
  sudo rsync -a dist/ "$dest"/
  sudo chown -R ubuntu:ubuntu "$dest"

  # 只清理 assets 里过期的旧 hash 文件，index.html / fonts 不动
  sudo find "$dest/assets" -maxdepth 1 -type f -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
}

sync_to "$WEB_ROOT/resume" "/"
sync_to "$WEB_ROOT/resume-sub" "/resume/"

sudo nginx -t >/dev/null
sudo systemctl reload nginx

echo "==> done"
ls -1 "$WEB_ROOT/resume/assets" "$WEB_ROOT/resume-sub/assets"
