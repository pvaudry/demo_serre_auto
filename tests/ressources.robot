*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${TIMEOUT}     10s

*** Keywords ***
Open Browser To App
    [Arguments]    ${base_url}
    Open Browser    ${base_url}    chrome
    ...    options=add_argument(--no-sandbox)
    ...    options=add_argument(--disable-dev-shm-usage)
    ...    options=add_argument(--disable-gpu)
    ...    options=add_argument(--disable-software-rasterizer)
    ...    options=add_argument(--remote-allow-origins=*)
    ...    options=add_argument(--user-data-dir=/tmp/chrome-profile)
    Set Selenium Timeout    ${TIMEOUT}
    Maximize Browser Window

Wait For Dashboard
    Wait Until Page Contains Element    css:canvas#chart-temp    ${TIMEOUT}

Set Setpoints
    [Arguments]    ${temp}    ${humi}    ${lux}
    Wait Until Element Is Visible    css:form#setpoints-form input[name="temperature"]
    Clear Element Text    css:form#setpoints-form input[name="temperature"]
    Input Text             css:form#setpoints-form input[name="temperature"]    ${temp}
    Clear Element Text    css:form#setpoints-form input[name="humidity"]
    Input Text             css:form#setpoints-form input[name="humidity"]       ${humi}
    Clear Element Text    css:form#setpoints-form input[name="luminosity"]
    Input Text             css:form#setpoints-form input[name="luminosity"]     ${lux}
    Click Button           css:form#setpoints-form button[type="submit"]

Reload History
    Click Button    id=reload
