"""Serve the site locally, telling the browser never to keep old copies of the files.

    python tools/serve.py          # http://127.0.0.1:5173/

Videos are sent in pieces (HTTP range requests), so they can start quickly and be skipped through.
"""
import functools
import http.server
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        m = re.match(r'bytes=(\d*)-(\d*)$', self.headers.get('Range', ''))
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path):
            return super().send_head()
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
        if left is None:
            return super().copyfile(source, outputfile)
        try:
            while left > 0:
                chunk = source.read(min(256 * 1024, left))
                if not chunk:
                    break
                outputfile.write(chunk)
                left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass                            # the browser stopped this piece, which is normal for video
        finally:
            self._left = None


if __name__ == '__main__':
    handler = functools.partial(Handler, directory=ROOT)
    http.server.ThreadingHTTPServer(('127.0.0.1', 5173), handler).serve_forever()
