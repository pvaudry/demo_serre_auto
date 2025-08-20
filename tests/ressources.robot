*** Settings ***
Library    SeleniumLibrary    timeout=30s
Library    RequestsLibrary

*** Variables ***
${TIMEOUT}        45s
${REMOTE_URL}     http://chrome:4444/wd/hub
${BROWSER}        chrome
${WINDOW_WIDTH}   1366
${WINDOW_HEIGHT}  768

*** Keywords ***
Wait App API
    Create Session    app    ${BASE_URL}
    Wait Until Keyword Succeeds    60x    1s    App Should Respond 200

App Should Respond 200
    ${resp}=    GET On Session    app    /healthz    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    200

Open Browser To App
    [Arguments]    ${base_url}
    Wait App API
    Open Browser    about:blank    ${BROWSER}    remote_url=${REMOTE_URL}
    Set Window Size    ${WINDOW_WIDTH}    ${WINDOW_HEIGHT}
    Set Selenium Timeout    ${TIMEOUT}
    Go To    ${base_url}

Dump Page On Failure
    Run Keyword And Ignore Error    Capture Page Screenshot
    ${src}=    Get Source
    Log    ${src}    level=DEBUG

Set Setpoints
    [Arguments]    ${temp}    ${humi}    ${lux}
    Wait Until Element Is Visible    css:form#setpoints-form input[name="temperature"]
    Input Text    css:form#setpoints-form input[name="temperature"]    ${temp}
    Input Text    css:form#setpoints-form input[name="humidity"]       ${humi}
    Input Text    css:form#setpoints-form input[name="luminosity"]     ${lux}
    Click Button    css:form#setpoints-form button[type="submit"]

Reload History
    Click Button    id=reload
