*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${TIMEOUT}     10s

*** Keywords ***
Open Browser To App
    [Arguments]    ${base_url}
    Open Browser    ${base_url}    chrome
    Set Selenium Timeout    ${TIMEOUT}
    Maximize Browser Window

Wait For Dashboard
    Wait Until Page Contains Element    css:canvas#chart-temp    ${TIMEOUT}
