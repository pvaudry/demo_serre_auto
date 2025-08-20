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
          docker version
          try { docker compose version } catch { if (Get-Command docker-compose -ErrorAction SilentlyContinue) { docker-compose --version } }
        '''
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
          $ErrorActionPreference = "Stop"

          # Détecte la bonne commande compose (v2 vs v1)
          $composeCmd = "docker compose"
          try { & docker compose version | Out-Null }
          catch {
            if (Get-Command docker-compose -ErrorAction SilentlyContinue) { $composeCmd = "docker-compose" }
            else { throw "Ni 'docker compose' ni 'docker-compose' n'est disponible." }
          }

          # Chemin du fichier compose (gère les espaces dans le workspace)
          $composeFile = Join-Path $pwd "docker-compose.ci.yml"

          # Lancer les services et faire échouer sur le code du conteneur robot
          & $composeCmd -f $composeFile up --abort-on-container-exit --exit-code-from robot
          $code = $LASTEXITCODE

          # Toujours tenter un down (sans casser le build si ça rate)
          try { & $composeCmd -f $composeFile down -v | Out-Null } catch { Write-Host "compose down a échoué (ignoré): $($_.Exception.Message)" }

          if ($code -ne 0) { exit $code }
        '''
      }
    }
  }

  post {
    always {
      // Archive les rapports Robot même en cas d'échec
      archiveArtifacts artifacts: 'reports/**', fingerprint: true, allowEmptyArchive: true
      // (Optionnel) publier le report HTML si plugin installé
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
