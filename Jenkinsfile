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

          & $docker 'version'
          try {
            & $docker 'compose' 'version'
            Write-Host "Compose v2 détecté via: $docker compose"
          } catch {
            $dc = (Get-Command docker-compose -ErrorAction SilentlyContinue)
            if ($dc) {
              & $dc.Source '--version'
              Write-Host "Compose v1 détecté: $($dc.Source)"
            } else {
              throw "Ni 'docker compose' (v2) ni 'docker-compose' (v1) disponible."
            }
          }
        '''
      }
    }

    stage('Build app image') {
      steps {
        powershell '''
          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }

          & $docker 'build' '-t' 'serre-app:ci' '.'
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

          # Vérifie la config
          & $docker 'compose' '-f' $composeFile 'config'
          if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

          # Lance les tests et renvoie le code du conteneur 'robot'
          & $docker 'compose' '-f' $composeFile 'up' '--abort-on-container-exit' '--exit-code-from' 'robot'
          $code = $LASTEXITCODE

          # Nettoyage
          try { & $docker 'compose' '-f' $composeFile 'down' '-v' | Out-Null }
          catch { Write-Host "compose down ignoré: $($_.Exception.Message)" }

          if ($code -ne 0) { exit $code }
        '''
      }
    }
  }

  post {
    always {
      // 1) Blue Ocean: consomme le JUnit XML
      junit 'reports/*.xml'

      // 2) Archives des rapports Robot (report.html, log.html, etc.)
      archiveArtifacts artifacts: 'reports/**', fingerprint: true, allowEmptyArchive: true

      // 3) (optionnel) Publication du HTML si tu as le plugin HTML Publisher
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
