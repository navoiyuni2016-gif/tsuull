"""Disposable local Docker HTTPS deployment. Never connects to the requested VM."""
import json,os,secrets,shutil,socket,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
with tempfile.TemporaryDirectory(prefix='tsuull-https-test-') as temp:
 root=Path(temp);env=os.environ.copy();env['ERP_COMPOSE_PROJECT']='tsuull-deploy-test-'+secrets.token_hex(4)
 for name in ['compose.yaml','compose.proxy.yaml','compose.cert.yaml','Dockerfile']:shutil.copy2(ROOT/name,root/name)
 shutil.copytree(ROOT/'deploy',root/'deploy',ignore=shutil.ignore_patterns('certs'))
 (root/'images').mkdir();(root/'images/runtime-images.tar.gz').symlink_to(ROOT/'images/runtime-images.tar.gz');shutil.copy2(ROOT/'images/runtime-images.sha256',root/'images/runtime-images.sha256')
 def run(args,**kwargs):return subprocess.run(args,cwd=root,env=env,check=True,capture_output=True,**kwargs)
 run(['bash','deploy/install.sh','--mode','cert','--prepare-only','--non-interactive'])
 http,https=port(),port();cfg=(root/'.env').read_text().replace('BIND_ADDRESS=172.20.0.50','BIND_ADDRESS=127.0.0.1').replace('ERP_HTTP_PORT=80','ERP_HTTP_PORT='+str(http)).replace('ERP_HTTPS_PORT=443','ERP_HTTPS_PORT='+str(https));(root/'.env').write_text(cfg)
 certs=root/'deploy/certs';certs.mkdir(mode=0o700)
 run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','2','-subj','/CN=el.tsuull.uz','-addext','subjectAltName=DNS:el.tsuull.uz','-keyout',str(certs/'privkey.pem'),'-out',str(certs/'fullchain.pem')])
 compose=['bash','deploy/compose.sh']
 try:
  result=run(['bash','deploy/install.sh','--mode','cert','--offline','--non-interactive','--skip-admin','--allow-different-host'])
  assert b'Ilova va baza ishga tushdi' in result.stdout
  curl=['curl','--silent','--show-error','--fail','--retry','8','--retry-delay','1','--retry-connrefused','--noproxy','*','--cacert',str(certs/'fullchain.pem'),'--resolve','el.tsuull.uz:'+str(https)+':127.0.0.1']
  base='https://el.tsuull.uz:'+str(https)
  response=run([x for x in curl if x!='--fail']+['--write-out','\n%{http_code}',base+'/health/ready']);payload,status=response.stdout.rsplit(b'\n',1);assert status==b'200', 'HTTPS readiness returned HTTP '+status.decode()+': '+payload.decode()[:300];assert json.loads(payload)['status']=='ready'
  password=secrets.token_hex(20);account=env.copy();account.update(USER_EMAIL='deploy-test@example.invalid',USER_NAME='Deployment fixture',USER_ROLE='ADMIN',USER_PASSWORD=password)
  subprocess.run(compose+['exec','-T','-e','USER_EMAIL','-e','USER_NAME','-e','USER_ROLE','-e','USER_PASSWORD','app','node','server/create-user.mjs'],cwd=root,env=account,check=True,capture_output=True)
  body=json.dumps({'email':account['USER_EMAIL'],'password':password}).encode()
  response=run(curl+['-D','-','-H','Origin: https://el.tsuull.uz','-H','Content-Type: application/json','--data-binary','@-',base+'/api/login'],input=body)
  assert b'__Host-erp_session=' in response.stdout and b'Secure' in response.stdout and b'HttpOnly' in response.stdout
  assert b'"role":"ADMIN"' in response.stdout
  initial=(root/'.env').read_bytes()
  # Re-run against the same test volume; backup happens before idempotent migrations.
  rerun=run(['bash','deploy/install.sh','--mode','cert','--offline','--non-interactive','--skip-admin','--allow-different-host'])
  assert initial==(root/'.env').read_bytes();assert list((root/'backups').glob('*.dump'))
  assert b'Backup written' in rerun.stdout
  response=run(curl+['-H','Origin: https://el.tsuull.uz','-H','Content-Type: application/json','--data-binary','@-',base+'/api/login'],input=body);assert json.loads(response.stdout)['user']['role']=='ADMIN'
  print('PASS: offline checksum/load, migrations, TLS for el.tsuull.uz on isolated loopback ports, certificate verification, Secure login, repeat install preserves keys/account/data and creates backup')
 finally:
  subprocess.run(compose+['down','--volumes','--remove-orphans'],cwd=root,env=env,capture_output=True,check=True)
