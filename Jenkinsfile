pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    parameters {
        booleanParam(
            name: 'DEMO_FAILURE',
            defaultValue: false,
            description: 'Enable this to intentionally fail the Jenkins pipeline for debugging demonstration.'
        )
    }

    environment {
        IMAGE_NAME = 'savemore-frontend'
        CONTAINER_NAME = 'Savemore'
        HOST_PORT = '8080'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Debug Environment') {
            steps {
                script {
                    runCommand(
                        'node --version && npm --version && docker --version && docker compose version',
                        'node --version; npm --version; docker --version; docker compose version'
                    )
                    runCommand(
                        'echo "Workspace: $PWD" && git rev-parse --short HEAD',
                        'Write-Host "Workspace: $PWD"; git rev-parse --short HEAD'
                    )
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    runCommand('npm ci')
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    runCommand('npm run lint')
                }
            }
        }

        stage('Build App') {
            steps {
                script {
                    runCommand('npm run build')
                }
            }
        }

        stage('Intentional Failure Demo') {
            when {
                expression { return params.DEMO_FAILURE }
            }
            steps {
                error('Intentional Jenkins failure enabled with DEMO_FAILURE=true. Disable it and rebuild to show the fix.')
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    runCommand(
                        "docker build --no-cache -t ${env.IMAGE_NAME}:${env.BUILD_NUMBER} -t ${env.IMAGE_NAME}:latest ."
                    )
                }
            }
        }

        stage('Deploy Container') {
            steps {
                script {
                    runCommand(
                        "docker rm -f ${env.CONTAINER_NAME} || true",
                        "docker rm -f ${env.CONTAINER_NAME}; if (\$LASTEXITCODE -ne 0) { Write-Host 'No existing container to remove.'; \$global:LASTEXITCODE = 0 }"
                    )
                    runCommand(
                        "docker run -d --name ${env.CONTAINER_NAME} -p ${env.HOST_PORT}:80 ${env.IMAGE_NAME}:latest"
                    )
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    runCommand(
                        "sleep 5 && docker ps --filter name=${env.CONTAINER_NAME} && docker logs --tail 50 ${env.CONTAINER_NAME} && curl -fsS http://localhost:${env.HOST_PORT}/health",
                        "Start-Sleep -Seconds 5; docker ps --filter name=${env.CONTAINER_NAME}; docker logs --tail 50 ${env.CONTAINER_NAME}; Invoke-WebRequest -UseBasicParsing http://localhost:${env.HOST_PORT}/health"
                    )
                }
            }
        }
    }

    post {
        always {
            script {
                runCommand(
                    "docker ps -a --filter name=${env.CONTAINER_NAME} || true",
                    "docker ps -a --filter name=${env.CONTAINER_NAME}; if (\$LASTEXITCODE -ne 0) { \$global:LASTEXITCODE = 0 }"
                )
            }
        }
        success {
            echo "SUCCESS: Savemore frontend is running at http://localhost:${env.HOST_PORT}"
        }
        failure {
            echo 'FAILURE: Check the failing stage logs above. Common fixes: run npm ci, start Docker Desktop, free port 8080, or disable DEMO_FAILURE.'
        }
    }
}

def runCommand(String unixCommand, String windowsCommand = null) {
    if (isUnix()) {
        sh unixCommand
    } else {
        powershell(windowsCommand ?: unixCommand)
    }
}
