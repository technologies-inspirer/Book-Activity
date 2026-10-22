"""Serve the site locally.

    python tools/serve.py          # http://127.0.0.1:5173/

Made to stay quick through a slow link too (VS Code port forwarding, a dev tunnel, a phone on Wi-Fi):
- connections are kept open between requests (HTTP/1.1), instead of a new one for every file;
- text files (html, js, css, json) are sent gzip-compressed, about a sixth of their size;
- pictures, sounds and videos are kept by the browser for a day, so pages turn without downloading again;
- the site's own code is checked for changes on every load (no-cache), so edits still show at once.
Videos are sent in pieces (HTTP range requests), so they can start quickly and be skipped through.
"""
import functools
import gzip
import http.server
import io
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TEXT = ('.html', '.js', '.css', '.json', '.svg', '.txt', '.md')
KEEP = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.wav', '.mp3', '.ico')


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def end_headers(self):
        path = self.path.split('?', 1)[0].lower()
        self.send_header('Cache-Control', 'public, max-age=86400' if path.endswith(KEEP) else 'no-cache')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        m = re.match(r'bytes=(\d*)-(\d*)$', self.headers.get('Range', ''))
        if m and os.path.isfile(path):
            return self.send_range(path, m)
        if (os.path.isfile(path) and path.lower().endswith(TEXT)
                and 'gzip' in self.headers.get('Accept-Encoding', '')):
            return self.send_gzip(path)
        return super().send_head()

    def send_gzip(self, path):
        with open(path, 'rb') as f:
            body = gzip.compress(f.read(), 6)
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Encoding', 'gzip')
        self.send_header('Vary', 'Accept-Encoding')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Last-Modified', self.date_time_string(int(os.path.getmtime(path))))
        self.end_headers()
        return io.BytesIO(body)

    def send_range(self, path, m):
        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else max(0, size - int(m.group(2)))
        end = int(m.group(2)) if m.group(1) and m.group(2) else size - 1
        end = min(end, size - 1)
        if start >= size:
            self.send_error(416)
            return None
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._left = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, '_left', None)
        try:
            if left is None:
                return super().copyfile(source, outputfile)
            while left > 0:
                chunk = source.read(min(256 * 1024, left))
                if not chunk:
                    break
                outputfile.write(chunk)
                left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            self.close_connection = True    # the browser stopped this piece, which is normal for video
        finally:
            self._left = None

    def log_message(self, fmt, *args):
        pass                                # keep the window quiet


if __name__ == '__main__':
    handler = functools.partial(Handler, directory=ROOT)
    print('Site running at http://127.0.0.1:5173/  (keep this window open)')
    http.server.ThreadingHTTPServer(('127.0.0.1', 5173), handler).serve_forever()
