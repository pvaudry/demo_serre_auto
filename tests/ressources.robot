*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${TIMEOUT}    30s

*** Keywords ***
Open App
    [Arguments]    ${base}
    Open Browser    ${base}    Remote
    ...    remote_url=${SELENIUM_REMOTE_URL}
    ...    options=add_argument(--no-sandbox);add_argument(--disable-dev-shm-usage)
    Set Selenium Timeout    ${TIMEOUT}

Wait App Ready
    Wait Until Page Contains Element    css:body    ${TIMEOUT}
