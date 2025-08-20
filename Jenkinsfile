pipeline {
  agent any
  options { timestamps() }
  environment { DOCKER_BUILDKIT = '1' }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build image') {
      steps {
        powershell '''
          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }
          & $docker build -t serre-app:ci .
          if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        '''
      }
    }

    stage('Run Robot tests') {
      steps {
        powershell '''
          $ErrorActionPreference = "Stop"
          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }

          $compose = Join-Path $pwd 'docker-compose.ci.yml'
          if (-not (Test-Path $compose)) { throw "Fichier introuvable: $compose" }

          # Lancer et faire échouer le job si 'robot' retourne un code != 0
          & $docker compose -f $compose up --abort-on-container-exit --exit-code-from robot
          $code = $LASTEXITCODE

          # Nettoyage (ne casse pas le build)
          try { & $docker compose -f $compose down -v | Out-Null } catch {}

          if ($code -ne 0) { exit $code }
        '''
      }
    }
  }

  post {
    always {
      // XML JUnit de Robot
      junit 'reports/xunit.xml'
      // HTML, logs, screenshots…
      archiveArtifacts artifacts: 'reports/**', fingerprint: true, allowEmptyArchive: true
    }
  }
}
