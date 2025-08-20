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

          $compose = @('-f','docker-compose.ci.yml')

          # On (re)crée proprement
          & $docker compose @compose down -v | Out-Null

          # Démarre app + chrome en arrière-plan
          & $docker compose @compose up -d app chrome
          if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

          # Attente active de l'app (jusqu'à 2 min)
          $deadline = (Get-Date).AddMinutes(2)
          do {
            Start-Sleep -Seconds 2
            try {
              $r = Invoke-WebRequest -UseBasicParsing http://localhost:5000/api/latest
              if ($r.StatusCode -eq 200) { $ok=$true }
            } catch { $ok=$false }
          } while (-not $ok -and (Get-Date) -lt $deadline)
          if (-not $ok) { throw "L'app n'est pas prête après 2 minutes" }

          # Lancer la suite Robot (service robot)
          & $docker compose @compose up --abort-on-container-exit --exit-code-from robot robot
          $code = $LASTEXITCODE

          # Nettoyage
          & $docker compose @compose down -v | Out-Null

          exit $code
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
