*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${TIMEOUT}     10s
${REMOTE_URL}  ${EMPTY}

*** Keywords ***
Open Browser To App
    [Arguments]    ${base_url}
    # Si REMOTE_URL est défini, on utilise le Chrome distant (selenium/standalone-chrome)
    ${remote}=    Get Variable Value    ${REMOTE_URL}    ${EMPTY}
    Run Keyword If    '${remote}'!=''    Open Browser    ${base_url}    chrome    remote_url=${remote}
    ...    ELSE    Open Browser    ${base_url}    chrome
    Set Selenium Timeout    ${TIMEOUT}
    Maximize Browser Window

Wait For Dashboard
    Wait Until Page Contains Element    css:canvas#chart-temp    ${TIMEOUT}
