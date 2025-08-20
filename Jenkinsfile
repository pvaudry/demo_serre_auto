pipeline {
  agent any
  options { timestamps() }
  environment { DOCKER_BUILDKIT = '1' }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Docker/Compose version') {
      steps {
        powershell '''
          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }

          & $docker version
          & $docker compose version
        '''
      }
    }

    stage('Build app image') {
      steps {
        powershell '''
          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }

          & $docker build -t serre-app:ci .
          if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        '''
      }
    }

    stage('Run tests (Robot)') {
      steps {
        powershell '''
          $ErrorActionPreference = "Stop"
          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }

          $composeFile = Join-Path $pwd 'docker-compose.ci.yml'
          Write-Host "Compose file path: $composeFile"
          if (-not (Test-Path $composeFile)) { throw "Fichier introuvable: $composeFile" }

          # Valide la config
          & $docker compose -f $composeFile config
          if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

          # Lance et récupère le code du conteneur 'robot'
          & $docker compose -f $composeFile up --abort-on-container-exit --exit-code-from robot
          $code = $LASTEXITCODE

          # Nettoyage
          try { & $docker compose -f $composeFile down -v | Out-Null } catch { }

          if ($code -ne 0) { exit $code }
        '''
      }
    }
  }

  post {
    always {
      // Blue Ocean : consomme le XML produit par Robot
      // (c’est /opt/robotframework/reports/xunit.xml dans le conteneur,
      // monté côté hôte sur ./reports)
      junit allowEmptyResults: true, testResults: 'reports/xunit.xml'

      // Archive les pages HTML de Robot
      archiveArtifacts artifacts: 'reports/**', fingerprint: true, allowEmptyArchive: true
    }
  }
}
