*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${TIMEOUT}            10s
${BROWSER}            ${EMPTY}
${SELENIUM_OPTIONS}   ${EMPTY}    # injectée par docker-compose (peut rester vide)

*** Keywords ***
Open Browser To App
    [Arguments]    ${base_url}
    # Navigateur par défaut = chrome si non fourni
    ${br}=    Set Variable If    '${BROWSER}'!=''    ${BROWSER}    chrome

    # Si SELENIUM_OPTIONS est défini (ex: "--no-sandbox --disable-dev-shm-usage --user-data-dir=/tmp/chrome-profile")
    # on le passe à Open Browser, sinon on ouvre sans options.
    ${has_opts}=    Run Keyword And Return Status    Should Not Be Empty    ${SELENIUM_OPTIONS}
    Run Keyword If    ${has_opts}
    ...    Open Browser    ${base_url}    ${br}    options=${SELENIUM_OPTIONS}
    ...    ELSE
    ...    Open Browser    ${base_url}    ${br}

    Set Selenium Timeout    ${TIMEOUT}
    Maximize Browser Window

Wait For Dashboard
    # Le canvas du premier graphique doit être présent
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
