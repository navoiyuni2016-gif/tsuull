"""Non-destructive deployment configuration checks; no remote SSH is used."""
import json,os,re,shutil,stat,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class DeploymentTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='tsuull-deployment-');self.root=Path(self.temp.name)
  for name in ['compose.yaml','compose.proxy.yaml','compose.cert.yaml','Dockerfile']:
   shutil.copy2(ROOT/name,self.root/name)
  shutil.copytree(ROOT/'deploy',self.root/'deploy',ignore=shutil.ignore_patterns('certs'))
 def tearDown(self):self.temp.cleanup()
 def install(self,*args):
  return subprocess.run(['bash','deploy/install.sh',*args],cwd=self.root,text=True,capture_output=True)
 def config(self):
  p=subprocess.run(['bash','deploy/compose.sh','config','--format','json'],cwd=self.root,text=True,capture_output=True,check=True)
  return json.loads(p.stdout)
 def prepare(self,mode):
  args=['--mode',mode,'--prepare-only','--non-interactive']
  if mode=='standalone':args+=['--acme-email','deployment-test@example.invalid']
  r=self.install(*args);self.assertEqual(r.returncode,0,r.stderr)
  return r
 def test_proxy_targets_real_domain_but_only_exposes_local_upstream(self):
  output=self.prepare('proxy');c=self.config();app=c['services']['app'];self.assertEqual(app['environment']['APP_ORIGIN'],'https://el.tsuull.uz');self.assertEqual(app['ports'][0]['host_ip'],'127.0.0.1');self.assertEqual(str(app['ports'][0]['published']),'8080');self.assertNotIn('caddy',c['services']);self.assertNotIn('ports',c['services']['db'])
  values=dict(l.split('=',1) for l in (self.root/'.env').read_text().splitlines());self.assertEqual(values['TARGET_SERVER_IP'],'172.20.0.50');self.assertEqual(values['ERP_DOMAIN'],'el.tsuull.uz');secret_values=[values[k] for k in ['DB_OWNER_PASSWORD','APP_DB_PASSWORD','MFA_ENCRYPTION_KEY']];self.assertTrue(all(re.fullmatch('[0-9a-f]{64}',s) for s in secret_values));self.assertTrue(len(set(secret_values))==3);self.assertTrue(all(s not in output.stdout+output.stderr for s in secret_values));self.assertEqual(stat.S_IMODE((self.root/'.env').stat().st_mode),0o600)
 def test_rerun_preserves_keys_and_mode_change_is_rejected(self):
  self.prepare('proxy');before=(self.root/'.env').read_bytes();self.prepare('proxy');self.assertTrue(before==(self.root/'.env').read_bytes());r=self.install('--mode','cert','--prepare-only','--non-interactive');self.assertNotEqual(r.returncode,0);self.assertTrue(before==(self.root/'.env').read_bytes());self.assertEqual((self.root/'.deploy-mode').read_text().strip(),'proxy');self.assertFalse((self.root/'.deploy-lock').exists())
 def test_standalone_binds_the_requested_vm_ip_and_uses_acme_contact(self):
  self.prepare('standalone');c=self.config();ports=c['services']['caddy']['ports'];self.assertTrue(all(p['host_ip']=='172.20.0.50' for p in ports));self.assertEqual({str(p['published']) for p in ports},{'80','443'});self.assertEqual(c['services']['caddy']['environment']['ERP_DOMAIN'],'el.tsuull.uz');self.assertEqual(c['services']['caddy']['environment']['ACME_EMAIL'],'deployment-test@example.invalid')
 def test_certificate_mode_mounts_custom_certificate_config(self):
  self.prepare('cert');c=self.config();volumes=c['services']['caddy']['volumes'];config=[v for v in volumes if v['target']=='/etc/caddy/Caddyfile'];self.assertEqual(len(config),1);self.assertTrue(config[0]['source'].endswith('Caddyfile.cert'));self.assertTrue(any(v['target']=='/etc/caddy/certs' and v['read_only'] for v in volumes))
 def test_existing_other_domain_is_not_overwritten(self):
  (self.root/'.env').write_text('ERP_DOMAIN=other.example.invalid\n');before=(self.root/'.env').read_bytes();r=self.install('--mode','proxy','--prepare-only','--non-interactive');self.assertNotEqual(r.returncode,0);self.assertTrue(before==(self.root/'.env').read_bytes());self.assertFalse((self.root/'.deploy-mode').exists())
 def test_public_tls_requires_a_contact_and_no_default_password_is_saved(self):
  r=self.install('--mode','standalone','--prepare-only','--non-interactive');self.assertNotEqual(r.returncode,0);self.assertFalse((self.root/'.env').exists());self.prepare('proxy');self.assertNotIn('USER_PASSWORD',(self.root/'.env').read_text())
if __name__=='__main__':unittest.main(verbosity=2)
