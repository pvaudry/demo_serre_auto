pipeline {
  agent any
  options { timestamps(); ansiColor('xterm') }
  environment { DOCKER_BUILDKIT = '1' }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Docker version') {
      steps {
        powershell 'docker version'
        powershell 'docker compose version'
      }
    }

    stage('Build app image') {
      steps {
        powershell 'docker build -t serre-app:ci .'
      }
    }

    stage('Run tests (Robot)') {
      steps {
        powershell '''
          if (Test-Path reports) { Remove-Item -Recurse -Force reports }
          New-Item -ItemType Directory -Force -Path reports | Out-Null
          docker compose -f docker-compose.ci.yml up --abort-on-container-exit --exit-code-from robot
        '''
      }
    }
  }

  post {
    always {
      powershell 'docker compose -f docker-compose.ci.yml down -v || $true'
      archiveArtifacts artifacts: 'reports/**', fingerprint: true, allowEmptyArchive: true
      script {
        if (fileExists('reports/report.html')) {
          publishHTML(target: [
            reportName: 'Robot Report',
            reportDir: 'reports',
            reportFiles: 'report.html,log.html',
            keepAll: true,
            alwaysLinkToLastBuild: true,
            allowMissing: true
          ])
        }
      }
    }
  }
}
