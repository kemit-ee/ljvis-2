import io,json,os,unittest
from unittest.mock import patch
from server import application,MAX_BODY

class ApiTests(unittest.TestCase):
    def call(self,payload=None,path='/v1/render',method='POST',**extra):
        raw=json.dumps(payload).encode();env={'PATH_INFO':path,'REQUEST_METHOD':method,'CONTENT_TYPE':'application/json','CONTENT_LENGTH':str(len(raw)),'wsgi.input':io.BytesIO(raw),**extra};meta={}
        body=b''.join(application(env,lambda status,headers:meta.update(status=int(status.split()[0]),headers=dict(headers))))
        return meta,body
    def test_health_and_catalog(self):
        for path in ('/health','/v1/templates'):
            meta,_=self.call(path=path,method='GET');self.assertEqual(meta['status'],200)
    def test_binary_and_base64_contract(self):
        with patch('server.render_pdf',return_value=(b'%PDF-example',[])) as renderer:
            meta,body=self.call({'templateCode':'vehicle-technical','blank':True});self.assertEqual(meta['status'],200);self.assertEqual(body,b'%PDF-example');self.assertEqual(meta['headers']['Cache-Control'],'no-store')
            self.assertEqual(meta['headers']['Content-Type'],'application/pdf')
            meta,body=self.call({'templateCode':'adr-form','blank':True,'output':'base64'})
            self.assertEqual(json.loads(body)['base64'],'JVBERi1leGFtcGxl');self.assertEqual(renderer.call_count,2)
    def test_invalid_requests_do_not_render(self):
        with patch('server.render_pdf') as renderer:
            for data in [{'templateCode':'../../private'},{'templateCode':'adr-form','blank':'false'},{'templateCode':'adr-form','output':'html'},{'templateCode':'adr-form','html':'<h1>anything</h1>'},{'templateCode':'adr-form','fields':[]},[]]:
                with self.subTest(data=data):self.assertEqual(self.call(data)[0]['status'],400)
            self.assertEqual(self.call({'templateCode':'adr-form'},CONTENT_LENGTH=str(MAX_BODY+1))[0]['status'],413)
            renderer.assert_not_called()
    def test_api_key_and_error_sanitization(self):
        with patch.dict(os.environ,{'PDF_CREATOR_API_KEY':'test-key'}):
            self.assertEqual(self.call({'templateCode':'adr-form'})[0]['status'],401)
            with patch('server.render_pdf',side_effect=ValueError('sensitive value')):
                meta,body=self.call({'templateCode':'adr-form'},HTTP_AUTHORIZATION='Bearer test-key');self.assertEqual(meta['status'],400);self.assertNotIn(b'sensitive',body)

if __name__=='__main__':unittest.main()
