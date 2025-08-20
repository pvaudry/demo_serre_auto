*** Settings ***
Library    SeleniumLibrary    timeout=30s

*** Variables ***
${TIMEOUT}        30s
${REMOTE_URL}     http://chrome:4444/wd/hub
${BROWSER}        chrome
${WINDOW_WIDTH}   1366
${WINDOW_HEIGHT}  768

*** Keywords ***
Open Browser To App
    [Arguments]    ${base_url}
    Open Browser    ${base_url}    ${BROWSER}    remote_url=${REMOTE_URL}
    Set Window Size    ${WINDOW_WIDTH}    ${WINDOW_HEIGHT}
    Set Selenium Timeout    ${TIMEOUT}

Wait For Dashboard
    # D’abord s’assurer que la page a bien répondu
    Wait Until Keyword Succeeds    5x    2s    Location Should Contain    ${/}
    # Puis attendre l’élément clé (présent dans le HTML)
    Wait Until Page Contains Element    css:canvas#chart-temp    ${TIMEOUT}

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
    Click Button  css:form#setpoints-form button[type="submit"]

Reload History
    Click Button  id=reload
