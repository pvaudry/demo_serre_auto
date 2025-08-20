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
      steps {
        powershell '''
          $ErrorActionPreference = "Stop"

          $docker = Join-Path $Env:ProgramFiles 'Docker\\Docker\\resources\\bin\\docker.exe'
          if (-not (Test-Path $docker)) { $docker = 'docker' }

          $composeFile = Join-Path $pwd 'docker-compose.ci.yml'

          # Détecte Compose v2 (docker compose) ou v1 (docker-compose)
          $useV2 = $true
          try {
            & $docker 'compose' 'version' | Out-Null
          } catch {
            $useV2 = $false
            $dc = (Get-Command docker-compose -ErrorAction SilentlyContinue)
            if (-not $dc) { throw "Ni 'docker compose' ni 'docker-compose' trouvé." }
            $dockerCompose = $dc.Source
          }

          # Helper pour appeler compose proprement (tokens séparés)
          function Invoke-Compose([string[]]$Args) {
            if ($useV2) { & $docker 'compose' @Args }
            else        { & $dockerCompose @Args }
          }

          # up + collecte du code retour du conteneur robot
          Invoke-Compose @('-f', $composeFile, 'up', '--abort-on-container-exit', '--exit-code-from', 'robot')
          $code = $LASTEXITCODE

          # down -v (ne casse pas le build si ça échoue)
          try { Invoke-Compose @('-f', $composeFile, 'down', '-v') | Out-Null } catch { Write-Host "compose down ignoré: $($_.Exception.Message)" }

          if ($code -ne 0) { exit $code }
        '''
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
