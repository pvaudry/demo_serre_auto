*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${TIMEOUT}     10s
${BROWSER}     ${EMPTY}

*** Keywords ***
Open Browser To App
    [Arguments]    ${base_url}
    ${br}=    Set Variable If    '${BROWSER}'!=''    ${BROWSER}    Chrome
    Open Browser    ${base_url}    ${br}
    Set Selenium Timeout    ${TIMEOUT}
    Maximize Browser Window

Wait For Dashboard
    Wait Until Page Contains Element    css:canvas#chart-temp    ${TIMEOUT}

Set Setpoints
    [Arguments]    ${temp}    ${humi}    ${lux}
    Wait Until Element Is Visible    css:form#setpoints-form input[name="temperature"]
    Input Text    css:form#setpoints-form input[name="temperature"]    ${temp}
    Input Text    css:form#setpoints-form input[name="humidity"]       ${humi}
    Input Text    css:form#setpoints-form input[name="luminosity"]     ${lux}
    Click Button  css:form#setpoints-form button[type="submit"]

Reload History
    Click Button  id=reload
