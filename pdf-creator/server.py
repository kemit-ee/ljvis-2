"""Small WSGI API, served by bounded Gunicorn workers in Docker."""
import base64
import hmac
import json
import logging
import os
from http import HTTPStatus
from render import TEMPLATES, render_pdf

MAX_BODY = 2 * 1024 * 1024


def validate_tree(value, depth=0):
    if depth > 16: raise ValueError('JSON nesting too deep')
    if isinstance(value,str) and len(value)>100_000: raise ValueError('Text field too long')
    if isinstance(value,list):
        if len(value)>1000: raise ValueError('Too many rows')
        for item in value:validate_tree(item,depth+1)
    if isinstance(value,dict):
        if len(value)>300:raise ValueError('Too many fields')
        for item in value.values():validate_tree(item,depth+1)


def application(environ, start_response):
    def reply(status, body, content_type='application/json', extra=()):
        if not isinstance(body,bytes):body=json.dumps(body,ensure_ascii=False).encode('utf-8')
        start_response(str(status)+' '+HTTPStatus(status).phrase,[('Content-Type',content_type),('Content-Length',str(len(body))),('Cache-Control','no-store'),('X-Content-Type-Options','nosniff'),*extra])
        return [body]
    path=environ.get('PATH_INFO','');method=environ.get('REQUEST_METHOD','GET')
    if path=='/health' and method=='GET':return reply(200,{'status':'ok'})
    token=os.environ.get('PDF_CREATOR_API_KEY','')
    if token and not hmac.compare_digest(environ.get('HTTP_AUTHORIZATION',''), 'Bearer '+token):
        return reply(401,{'error':'unauthorized'})
    if path=='/v1/templates' and method=='GET':return reply(200,{'templates':list(TEMPLATES),'modes':['blank','filled'],'outputs':['pdf','base64']})
    if path!='/v1/render':return reply(404,{'error':'not_found'})
    if method!='POST':return reply(405,{'error':'method_not_allowed'},extra=[('Allow','POST')])
    if environ.get('CONTENT_TYPE','').split(';')[0].strip()!='application/json':return reply(415,{'error':'application/json required'})
    try:
        length=int(environ.get('CONTENT_LENGTH') or '0')
        if length<=0:return reply(400,{'error':'body required'})
        if length>MAX_BODY:return reply(413,{'error':'body too large'})
        raw=environ['wsgi.input'].read(length)
        if len(raw)!=length:raise ValueError('Incomplete request body')
        request=json.loads(raw)
        if not isinstance(request,dict):raise ValueError('Request must be an object')
        validate_tree(request)
        if set(request)-{'templateCode','blank','fields','output'}:raise ValueError('Unknown request fields')
        template=request.get('templateCode');blank=request.get('blank',False);output=request.get('output','pdf')
        if not isinstance(template,str) or template not in TEMPLATES:raise ValueError('Unknown template')
        if type(blank) is not bool:raise ValueError('blank must be boolean')
        if output not in ('pdf','base64'):raise ValueError('output must be pdf or base64')
        data=request.get('fields',{})
        if not isinstance(data,dict):raise ValueError('data must be an object')
        pdf,warnings=render_pdf(data,blank,template)
    except (ValueError,TypeError,KeyError,AttributeError,UnicodeError,RecursionError):
        # No submitted values or personal data in errors/logs.
        return reply(400,{'error':'invalid_request','message':'Check template, field types, parent IDs and form-specific requirements.'})
    except Exception:
        logging.error('PDF rendering failed')
        return reply(500,{'error':'render_failed'})
    filename=template+('-blank' if blank else '')+'.pdf'
    if output=='base64':return reply(200,{'filename':filename,'contentType':'application/pdf','base64':base64.b64encode(pdf).decode('ascii'),'warnings':warnings})
    return reply(200,pdf,'application/pdf',[('Content-Disposition','attachment; filename="'+filename+'"'),('X-PDF-Warning-Count',str(len(warnings)))])
