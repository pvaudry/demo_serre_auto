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
          # Résout docker.exe via chemin absolu (utile pour le service Jenkins)
          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }

          & $docker 'version'

          # Test Compose v2
          $useV2 = $false
          try {
            & $docker 'compose' 'version'
            $useV2 = $true
            Write-Host "Compose v2 détecté via: $docker compose"
          } catch {
            # Essai Compose v1
            $dc = (Get-Command docker-compose -ErrorAction SilentlyContinue)
            if ($dc) {
              & $dc.Source '--version'
              Write-Host "Compose v1 détecté: $($dc.Source)"
            } else {
              throw "Ni 'docker compose' (v2) ni 'docker-compose' (v1) n'est disponible dans ce contexte Jenkins."
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
        stage('Tests') {
            steps {
                powershell '''
                $ErrorActionPreference = "Stop"

                # Résoudre docker.exe (quand Jenkins tourne en service)
                $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
                if (-not (Test-Path $docker)) { $docker = 'docker' }

                $composeFile = Join-Path $pwd 'docker-compose.ci.yml'
                Write-Host "Compose file path: $composeFile"
                if (-not (Test-Path $composeFile)) {
                    throw "Fichier introuvable: $composeFile"
                }

                # Affiche la config pour vérifier que le YAML est valide ET vu par Compose
                & $docker 'compose' '-f' $composeFile 'config'
                if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                # Lancer les services et faire échouer sur le code du conteneur 'robot'
                & $docker 'compose' '-f' $composeFile 'up' '--abort-on-container-exit' '--exit-code-from' 'robot'
                $code = $LASTEXITCODE

                # Toujours tenter un down -v (ne casse pas le build si ça rate)
                try {
                    & $docker 'compose' '-f' $composeFile 'down' '-v' | Out-Null
                } catch {
                    Write-Host "compose down ignoré: $($_.Exception.Message)"
                }

                if ($code -ne 0) { exit $code }
                '''
            }
        }
    }

  }

  post {
    always {
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
