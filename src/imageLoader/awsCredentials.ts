
const awsCredentials = (config) => {
  if(config.integrationMode === 'LocalStorage') {
    const credentials = {
      accessKeyId: window.localStorage.getItem('accessKeyID'),
      secretAccessKey: window.localStorage.getItem('secretAccessKey'),
      service: 'medical-imaging'
    }
    return credentials
  } else {
    return {}
  }
};

export default awsCredentials;
