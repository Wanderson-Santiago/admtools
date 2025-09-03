// =============================
        // VARIÁVEIS GLOBAIS
        // =============================
        
        let usuarioAtual = null;
        let usuarios = [];
        let informacoesSistema = {};
        let senhas = {};
        let menus = [];
        let anotacoes = [];
        let consultasSalvas = [];
        let downloads = [];
        let sites = [];
        let statusConexao = 'desconectado';
        let conexaoAtual = null;
        let promptPWA = null;
        let anotacoesAtendimento = [];
        let tarefas = [];
        let elementoArrastado = null;
        let tarefasPessoais = [];
        let escalaPessoal = [];
        let tarefasAtribuidas = [];
        let escalasUsuarios = {};
        let dataCalendarioAtual = new Date();
        let escalaPadraoTrabalho = { inicio: '08:00', fim: '17:00' };
        let baseConhecimento = [];
        let clientes = [];
        let atendimentos = [];
        let senhasVisiveis = true;
        
        // =============================
        // SISTEMA DE ARMAZENAMENTO CLOUDFLARE
        // =============================
        
        const CLOUDFLARE_CONFIG = {
            accountId: 'YOUR_ACCOUNT_ID', // Substituir por conta real
            apiToken: 'YOUR_API_TOKEN',   // Substituir por token real
            kvNamespaceId: 'YOUR_KV_NAMESPACE_ID' // Substituir por namespace real
        };
        
        // Função para salvar dados no Cloudflare KV
        async function salvarNoCloudflare(chave, dados) {
            try {
                const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/storage/kv/namespaces/${CLOUDFLARE_CONFIG.kvNamespaceId}/values/${chave}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dados)
                });
                
                if (response.ok) {
                    console.log(`Dados salvos no Cloudflare: ${chave}`);
                    return true;
                } else {
                    throw new Error('Erro ao salvar no Cloudflare');
                }
            } catch (error) {
                console.warn(`Erro ao salvar no Cloudflare, usando localStorage: ${error.message}`);
                // Fallback para localStorage
                localStorage.setItem(chave, JSON.stringify(dados));
                return false;
            }
        }
        
        // Função para carregar dados do Cloudflare KV
        async function carregarDoCloudflare(chave) {
            try {
                const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/storage/kv/namespaces/${CLOUDFLARE_CONFIG.kvNamespaceId}/values/${chave}`, {
                    headers: {
                        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`
                    }
                });
                
                if (response.ok) {
                    const dados = await response.json();
                    console.log(`Dados carregados do Cloudflare: ${chave}`);
                    return dados;
                } else {
                    throw new Error('Dados não encontrados no Cloudflare');
                }
            } catch (error) {
                console.warn(`Erro ao carregar do Cloudflare, usando localStorage: ${error.message}`);
                // Fallback para localStorage
                const dadosLocal = localStorage.getItem(chave);
                return dadosLocal ? JSON.parse(dadosLocal) : null;
            }
        }
        
        // Função para sincronizar dados
        async function sincronizarDados() {
            const chaves = ['usuarios', 'menus', 'anotacoes', 'consultasSalvas', 'downloads', 'sites', 'baseConhecimento', 'tarefasPessoais', 'escalaPessoal', 'clientes', 'atendimentos'];
            
            for (const chave of chaves) {
                const dadosLocais = localStorage.getItem(chave);
                if (dadosLocais) {
                    await salvarNoCloudflare(chave, JSON.parse(dadosLocais));
                }
            }
            
            mostrarToast('Dados sincronizados!', 'sucesso');
        }
        
        // =============================
        // INICIALIZAÇÃO
        // =============================
        
        document.addEventListener('DOMContentLoaded', function() {
            inicializarAplicacao();
        });
        
        async function inicializarAplicacao() {
            try {
                console.log('Inicializando aplicação...');
                
                // Inicializar usuários padrão
                await inicializarUsuariosPadrao();
                
                // Verificar se está logado
                verificarStatusLogin();
                
                // Configurar PWA
                configurarPWA();
                
                // Carregar informações do sistema
                carregarInformacoesSistema();
                
                // Carregar senhas
                carregarSenhas();

                // Configurar máscaras
                configurarMascaras();
                
                console.log('Aplicação inicializada com sucesso');
                
            } catch (error) {
                console.error('Erro na inicialização:', error);
                mostrarToast('Erro ao inicializar aplicação', 'erro');
            }
        }
        
        async function inicializarUsuariosPadrao() {
            let usuariosSalvos = await carregarDoCloudflare('usuarios');
            if (usuariosSalvos) {
                usuarios = usuariosSalvos;
            } else {
                usuarios = [
                    {
                        id: 1,
                        nomeUsuario: 'admin',
                        senha: 'admin123',
                        nomeCompleto: 'Administrador',
                        papel: 'admin',
                        permissoes: {
                            menus: true,
                            xml: true,
                            anotacoes: true,
                            sql: true,
                            banco_dados: true,
                            downloads: true,
                            sites: true,
                            atendimento: true,
                            agenda: true,
                            admin_agenda: true,
                            usuarios: true,
                            conhecimento: true,
                            atendimentos_registros: true
                        },
                        criadoEm: new Date().toISOString()
                    }
                ];
                await salvarNoCloudflare('usuarios', usuarios);
            }
        }
        
        function verificarStatusLogin() {
            const usuarioSalvo = localStorage.getItem('usuarioAtual');
            if (usuarioSalvo) {
                usuarioAtual = JSON.parse(usuarioSalvo);
                mostrarAplicacaoPrincipal();
            } else {
                mostrarTelaLogin();
            }
        }
        
        // =============================
        // SISTEMA DE PERMISSÕES
        // =============================
        
        function verificarPermissao(permissao) {
            if (!usuarioAtual) return false;
            if (usuarioAtual.papel === 'admin') return true;
            return usuarioAtual.permissoes && usuarioAtual.permissoes[permissao];
        }
        
        function aplicarPermissoes() {
            // Verificar elementos com data-permissao
            const elementosComPermissao = document.querySelectorAll('[data-permissao]');
            elementosComPermissao.forEach(elemento => {
                const permissaoNecessaria = elemento.getAttribute('data-permissao');
                if (!verificarPermissao(permissaoNecessaria)) {
                    elemento.classList.add('permissao-negada');
                    elemento.setAttribute('title', 'Você não tem permissão para acessar esta funcionalidade');
                } else {
                    elemento.classList.remove('permissao-negada');
                    elemento.removeAttribute('title');
                }
            });
        }
        
        // =============================
        // FUNÇÕES DE TELA
        // =============================
        
        function mostrarTelaLogin() {
            document.getElementById('tela-login').classList.remove('hidden');
            document.getElementById('tela-cadastro').classList.add('hidden');
            document.getElementById('aplicacao-principal').classList.add('hidden');
        }
        
        function mostrarFormularioCadastro() {
            document.getElementById('tela-login').classList.add('hidden');
            document.getElementById('tela-cadastro').classList.remove('hidden');
        }
        
        function mostrarFormularioLogin() {
            document.getElementById('tela-cadastro').classList.add('hidden');
            document.getElementById('tela-login').classList.remove('hidden');
        }
        
        function mostrarAplicacaoPrincipal() {
            document.getElementById('tela-login').classList.add('hidden');
            document.getElementById('tela-cadastro').classList.add('hidden');
            document.getElementById('aplicacao-principal').classList.remove('hidden');
            
            // Atualizar nome do usuário
            if (usuarioAtual) {
                document.getElementById('nome-usuario-logado').textContent = usuarioAtual.nomeCompleto || usuarioAtual.nomeUsuario;
            }
            
            // Configurar controles admin
            configurarControlesAdmin();
            
            // Aplicar permissões
            aplicarPermissoes();
            
            // Carregar dados
            carregarTodosDados();

            // Configurar visibilidade inicial das senhas
            const senhasVisiveisStorage = localStorage.getItem('senhasVisiveis');
            senhasVisiveis = senhasVisiveisStorage !== null ? JSON.parse(senhasVisiveisStorage) : true;
            aplicarVisibilidadeCardSenhas();
        }
        
        // =============================
        // AUTENTICAÇÃO
        // =============================
        
        document.getElementById('formulario-login').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nomeUsuario = document.getElementById('nome-usuario').value.trim();
            const senha = document.getElementById('senha-usuario').value;
            const textoBtn = document.getElementById('texto-botao-login');
            
            if (!nomeUsuario || !senha) {
                mostrarToast('Preencha todos os campos', 'aviso');
                return;
            }
            
            textoBtn.innerHTML = '<span class="carregador"></span>Entrando...';
            
            setTimeout(async () => {
                const usuario = usuarios.find(u => u.nomeUsuario === nomeUsuario && u.senha === senha);
                
                if (usuario) {
                    usuarioAtual = usuario;
                    localStorage.setItem('usuarioAtual', JSON.stringify(usuarioAtual));
                    mostrarToast('Login realizado com sucesso!', 'sucesso');
                    
                    setTimeout(() => {
                        mostrarAplicacaoPrincipal();
                    }, 1000);
                } else {
                    mostrarToast('Usuário ou senha inválidos', 'erro');
                }
                
                textoBtn.textContent = 'Entrar';
            }, 1000);
        });
        
        document.getElementById('formulario-cadastro').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nomeCompleto = document.getElementById('nome-completo-cad').value.trim();
            const nomeUsuario = document.getElementById('nome-usuario-cad').value.trim();
            const senha = document.getElementById('senha-cad').value;
            const confirmarSenha = document.getElementById('confirmar-senha-cad').value;
            const textoBtn = document.getElementById('texto-botao-cadastro');
            
            if (!nomeCompleto || !nomeUsuario || !senha || !confirmarSenha) {
                mostrarToast('Preencha todos os campos', 'aviso');
                return;
            }
            
            if (senha !== confirmarSenha) {
                mostrarToast('As senhas não coincidem', 'erro');
                return;
            }
            
            if (senha.length < 6) {
                mostrarToast('A senha deve ter pelo menos 6 caracteres', 'erro');
                return;
            }
            
            if (usuarios.find(u => u.nomeUsuario === nomeUsuario)) {
                mostrarToast('Usuário já existe', 'erro');
                return;
            }
            
            textoBtn.innerHTML = '<span class="carregador"></span>Cadastrando...';
            
            setTimeout(async () => {
                const novoUsuario = {
                    id: Date.now(),
                    nomeUsuario,
                    senha,
                    nomeCompleto,
                    papel: 'usuario',
                    permissoes: {
                        menus: true,
                        xml: true,
                        anotacoes: true,
                        sql: true,
                        banco_dados: false,
                        downloads: true,
                        sites: true,
                        atendimento: true,
                        agenda: true,
                        admin_agenda: false,
                        usuarios: false,
                        conhecimento: true,
                        atendimentos_registros: true
                    },
                    criadoEm: new Date().toISOString()
                };
                
                usuarios.push(novoUsuario);
                await salvarNoCloudflare('usuarios', usuarios);
                
                mostrarToast('Cadastro realizado com sucesso! Faça login.', 'sucesso');
                
                setTimeout(() => {
                    mostrarFormularioLogin();
                }, 1500);
                
                textoBtn.textContent = 'Cadastrar';
            }, 1000);
        });
        
        function logout() {
            if (confirm('Tem certeza que deseja sair?')) {
                usuarioAtual = null;
                localStorage.removeItem('usuarioAtual');
                mostrarTelaLogin();
                mostrarToast('Logout realizado com sucesso!', 'sucesso');
            }
        }
        
        // =============================
        // FUNÇÕES DE SENHA
        // =============================
        
        function alternarVisibilidadeSenhaLogin() {
            const inputSenha = document.getElementById('senha-usuario');
            const iconeOlho = document.getElementById('olho-senha-login');
            
            if (inputSenha.type === 'password') {
                inputSenha.type = 'text';
                iconeOlho.classList.remove('fa-eye');
                iconeOlho.classList.add('fa-eye-slash');
            } else {
                inputSenha.type = 'password';
                iconeOlho.classList.remove('fa-eye-slash');
                iconeOlho.classList.add('fa-eye');
            }
        }
        
        function alternarVisibilidadeSenhaCadastro() {
            const inputSenha = document.getElementById('senha-cad');
            const iconeOlho = document.getElementById('olho-senha-cadastro');
            
            if (inputSenha.type === 'password') {
                inputSenha.type = 'text';
                iconeOlho.classList.remove('fa-eye');
                iconeOlho.classList.add('fa-eye-slash');
            } else {
                inputSenha.type = 'password';
                iconeOlho.classList.remove('fa-eye-slash');
                iconeOlho.classList.add('fa-eye');
            }
        }
        
        function alternarVisibilidadeSenha(idSenha) {
            const elementoSenha = document.getElementById(idSenha);
            const elementoOlho = document.getElementById(idSenha + '-olho');
            const senhaReal = elementoSenha.getAttribute('data-senha');
            
            if (elementoSenha.classList.contains('senha-oculta')) {
                elementoSenha.textContent = senhaReal;
                elementoSenha.classList.remove('senha-oculta');
                elementoOlho.classList.remove('fa-eye');
                elementoOlho.classList.add('fa-eye-slash');
            } else {
                elementoSenha.textContent = '•'.repeat(senhaReal.length);
                elementoSenha.classList.add('senha-oculta');
                elementoOlho.classList.remove('fa-eye-slash');
                elementoOlho.classList.add('fa-eye');
            }
        }
        
        function copiarSenha(idSenha) {
            const elementoSenha = document.getElementById(idSenha);
            const senha = elementoSenha.getAttribute('data-senha');
            copiarParaAreaTransferencia(senha);
        }

        function alternarVisibilidadeCardSenhas() {
            senhasVisiveis = !senhasVisiveis;
            localStorage.setItem('senhasVisiveis', JSON.stringify(senhasVisiveis));
            aplicarVisibilidadeCardSenhas();
        }

        function aplicarVisibilidadeCardSenhas() {
            const cardSenhas = document.getElementById('card-senhas');
            const iconeToggleSenhas = document.getElementById('icone-toggle-senhas');
            const iconeCardSenhas = document.getElementById('icone-card-senhas');
            
            if (senhasVisiveis) {
                cardSenhas.classList.remove('oculto');
                if (iconeToggleSenhas) {
                    iconeToggleSenhas.classList.remove('fa-eye-slash');
                    iconeToggleSenhas.classList.add('fa-eye');
                }
                if (iconeCardSenhas) {
                    iconeCardSenhas.classList.remove('fa-eye-slash');
                    iconeCardSenhas.classList.add('fa-eye');
                }
            } else {
                cardSenhas.classList.add('oculto');
                if (iconeToggleSenhas) {
                    iconeToggleSenhas.classList.remove('fa-eye');
                    iconeToggleSenhas.classList.add('fa-eye-slash');
                }
                if (iconeCardSenhas) {
                    iconeCardSenhas.classList.remove('fa-eye');
                    iconeCardSenhas.classList.add('fa-eye-slash');
                }
            }
        }
        
        // =============================
        // SISTEMA DE INFORMAÇÕES
        // =============================
        
        function carregarInformacoesSistema() {
            // Gerar senha dinâmica
            const agora = new Date();
            const dia = agora.getDate();
            const mes = agora.getMonth() + 1;
            const sufixoAno = parseInt(agora.getFullYear().toString().slice(-2));
            const soma = dia + mes + sufixoAno;
            
            informacoesSistema = {
                senhaDinamica: `AdmPwd20${soma}`,
                userAgent: navigator.userAgent,
                plataforma: navigator.platform,
                idioma: navigator.language,
                idiomas: navigator.languages ? navigator.languages.join(', ') : 'N/A',
                cookiesHabilitados: navigator.cookieEnabled,
                online: navigator.onLine,
                nucleosHardware: navigator.hardwareConcurrency || 'N/A',
                memoriaDispositivo: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'N/A',
                pontosToque: navigator.maxTouchPoints || 0,
                larguraTela: screen.width,
                alturaTela: screen.height,
                larguraDisponivel: screen.availWidth,
                alturaDisponivel: screen.availHeight,
                profundidadeCor: screen.colorDepth,
                profundidadePixel: screen.pixelDepth,
                fusoHorario: Intl.DateTimeFormat().resolvedOptions().timeZone,
                horarioAtual: new Date().toLocaleString('pt-BR')
            };
            
            // Tentar obter IP público
            obterIPPublico();
            
            // Tentar obter informações do computador
            obterInfoComputador();
            
            // Atualizar display
            atualizarDisplayInformacoesSistema();
        }
        
        function obterIPPublico() {
            // Múltiplas APIs para IP público
            const apisIP = [
                'https://api.ipify.org?format=json',
                'https://ipapi.co/json/',
                'https://ip.seeip.org/jsonip?',
                'https://httpbin.org/ip'
            ];
            
            let indiceAPI = 0;
            
            function tentarProximaAPI() {
                if (indiceAPI >= apisIP.length) {
                    informacoesSistema.ipPublico = 'Não disponível';
                    atualizarDisplayInformacoesSistema();
                    return;
                }
                
                const apiAtual = apisIP[indiceAPI];
                console.log(`Tentando API ${indiceAPI + 1}: ${apiAtual}`);
                
                fetch(apiAtual, { 
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) throw new Error('Resposta da API não ok');
                    return response.json();
                })
                .then(dados => {
                    let ip = null;
                    // Diferentes formatos de resposta das APIs
                    if (dados.ip) ip = dados.ip;
                    else if (dados.origin) ip = dados.origin;
                    else if (dados.query) ip = dados.query;
                    
                    if (ip && validarIP(ip)) {
                        informacoesSistema.ipPublico = ip;
                        console.log(`IP público obtido: ${ip}`);
                        atualizarDisplayInformacoesSistema();
                    } else {
                        throw new Error('Formato de IP inválido');
                    }
                })
                .catch(erro => {
                    console.log(`Erro na API ${indiceAPI + 1}:`, erro);
                    indiceAPI++;
                    tentarProximaAPI();
                });
            }
            
            tentarProximaAPI();
        }
        
        function obterInfoComputador() {
            // Tentar obter nome do computador e IP local via WebRTC
            try {
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' }
                    ]
                });
                
                pc.createDataChannel('');
                
                pc.onicecandidate = (ice) => {
                    if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                    
                    const candidato = ice.candidate.candidate;
                    const matchIP = candidato.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                    
                    if (matchIP && matchIP[1]) {
                        const ip = matchIP[1];
                        // Filtrar IPs locais válidos
                        if (validarIPLocal(ip)) {
                            informacoesSistema.ipLocal = ip;
                            console.log(`IP local obtido: ${ip}`);
                            atualizarDisplayInformacoesSistema();
                            pc.onicecandidate = () => {}; // Parar após o primeiro IP válido
                        }
                    }
                };
                
                pc.createOffer()
                    .then(pc.setLocalDescription.bind(pc))
                    .catch(erro => {
                        console.log('Erro no WebRTC:', erro);
                        informacoesSistema.ipLocal = 'Não disponível';
                        atualizarDisplayInformacoesSistema();
                    });
                
                // Timeout para WebRTC
                setTimeout(() => {
                    if (!informacoesSistema.ipLocal) {
                        informacoesSistema.ipLocal = 'Não disponível';
                        atualizarDisplayInformacoesSistema();
                    }
                }, 3000);
                
            } catch (erro) {
                console.log('WebRTC não suportado:', erro);
                informacoesSistema.ipLocal = 'Não disponível';
                atualizarDisplayInformacoesSistema();
            }

            // Tentar obter nome do computador via hostname
            try {
                informacoesSistema.nomeComputador = window.location.hostname || 'Não disponível';
            } catch (erro) {
                informacoesSistema.nomeComputador = 'Não disponível';
            }
        }
        
        function validarIP(ip) {
            const regexIP = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
            return regexIP.test(ip);
        }
        
        function validarIPLocal(ip) {
            if (!validarIP(ip)) return false;
            
            const partes = ip.split('.').map(Number);
            
            // Excluir loopback (127.x.x.x)
            if (partes[0] === 127) return false;
            
            // Excluir link-local (169.254.x.x)
            if (partes[0] === 169 && partes[1] === 254) return false;
            
            // Aceitar redes privadas
            // 10.0.0.0/8
            if (partes[0] === 10) return true;
            
            // 172.16.0.0/12
            if (partes[0] === 172 && partes[1] >= 16 && partes[1] <= 31) return true;
            
            // 192.168.0.0/16
            if (partes[0] === 192 && partes[1] === 168) return true;
            
            return false;
        }
        
        function obterInfoNavegador() {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Google Chrome';
            if (ua.includes('Firefox')) return 'Mozilla Firefox';
            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
            if (ua.includes('Edg')) return 'Microsoft Edge';
            if (ua.includes('Opera')) return 'Opera';
            return 'Navegador desconhecido';
        }
        
        function obterInfoSO() {
            const ua = navigator.userAgent;
            if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
            if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
            if (ua.includes('Windows NT 6.1')) return 'Windows 7';
            if (ua.includes('Windows')) return 'Windows';
            if (ua.includes('Mac OS X')) {
                const versao = ua.match(/Mac OS X ([0-9_]+)/);
                return versao ? `macOS ${versao[1].replace(/_/g, '.')}` : 'macOS';
            }
            if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
            if (ua.includes('Android')) {
                const versao = ua.match(/Android ([0-9.]+)/);
                return versao ? `Android ${versao[1]}` : 'Android';
            }
            if (ua.includes('iOS')) return 'iOS';
            return 'Sistema desconhecido';
        }
        
        function atualizarDisplayInformacoesSistema() {
            const grade = document.getElementById('grade-informacoes-sistema');
            if (!grade) return;
            
            const itensInfo = [
                { rotulo: 'IP Público', valor: informacoesSistema.ipPublico || 'Carregando...', icone: 'fa-globe' },
                { rotulo: 'IP Local', valor: informacoesSistema.ipLocal || 'Carregando...', icone: 'fa-home' },
                { rotulo: 'Nome do Computador', valor: informacoesSistema.nomeComputador || 'Não disponível', icone: 'fa-desktop' },
                { rotulo: 'Navegador', valor: obterInfoNavegador(), icone: 'fa-chrome' },
                { rotulo: 'Sistema Operacional', valor: obterInfoSO(), icone: 'fa-laptop' },
                { rotulo: 'Plataforma', valor: informacoesSistema.plataforma, icone: 'fa-microchip' },
                { rotulo: 'Idioma', valor: informacoesSistema.idioma, icone: 'fa-language' },
                { rotulo: 'Timezone', valor: informacoesSistema.fusoHorario, icone: 'fa-clock' },
                { rotulo: 'Resolução da Tela', valor: `${informacoesSistema.larguraTela}x${informacoesSistema.alturaTela}`, icone: 'fa-tv' },
                { rotulo: 'Área Disponível', valor: `${informacoesSistema.larguraDisponivel}x${informacoesSistema.alturaDisponivel}`, icone: 'fa-expand' },
                { rotulo: 'Profundidade de Cor', valor: `${informacoesSistema.profundidadeCor} bits`, icone: 'fa-palette' },
                { rotulo: 'Cores Lógicos CPU', valor: informacoesSistema.nucleosHardware, icone: 'fa-microchip' },
                { rotulo: 'Memória RAM', valor: informacoesSistema.memoriaDispositivo, icone: 'fa-memory' },
                { rotulo: 'Pontos de Toque', valor: informacoesSistema.pontosToque, icone: 'fa-hand-pointer' },
                { rotulo: 'Status Online', valor: informacoesSistema.online ? 'Online' : 'Offline', icone: 'fa-signal' },
                { rotulo: 'Cookies Habilitados', valor: informacoesSistema.cookiesHabilitados ? 'Sim' : 'Não', icone: 'fa-cookie' },
                { rotulo: 'Data/Hora Atual', valor: informacoesSistema.horarioAtual, icone: 'fa-calendar-alt' }
            ];
            
            grade.innerHTML = itensInfo.map(item => `
                <div class="bg-gray-50 p-4 rounded-lg border">
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-medium text-gray-700">
                            <i class="fas ${item.icone} mr-2 text-blue-600"></i>
                            ${item.rotulo}:
                        </label>
                        <button onclick="copiarParaAreaTransferencia('${item.valor}')" class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="text-gray-800 text-sm break-all">
                        ${item.valor}
                    </div>
                </div>
            `).join('');
        }
        
        // =============================
        // SISTEMA DE SENHAS
        // =============================
        
        function carregarSenhas() {
            senhas = {
                'senha-dinamica': informacoesSistema.senhaDinamica,
                'senha-pdv': 'AdmPwd20',
                'senha-padrao': 'AdmPwd6333',
                'senha-sql': 'PoliSystemsapwd',
                'senha-sql-dominio': 'PoliSystemsapwd123'
            };
            
            atualizarDisplaySenhas();
        }
        
        function atualizarDisplaySenhas() {
            const grade = document.getElementById('grade-senhas');
            if (!grade) return;
            
            const itensSenha = [
                { id: 'senha-dinamica', rotulo: 'AdmPwd (Data)', valor: senhas['senha-dinamica'] },
                { id: 'senha-pdv', rotulo: 'PDV', valor: senhas['senha-pdv'] },
                { id: 'senha-padrao', rotulo: 'Padrão', valor: senhas['senha-padrao'] },
                { id: 'senha-sql', rotulo: 'SQL', valor: senhas['senha-sql'] },
                { id: 'senha-sql-dominio', rotulo: 'SQL Domínio', valor: senhas['senha-sql-dominio'] }
            ];
            
            grade.innerHTML = itensSenha.map(item => `
                <div class="bg-gray-50 p-4 rounded-lg border">
                    <label class="block text-sm font-medium text-gray-700 mb-2">${item.rotulo}:</label>
                    <div class="flex justify-between items-center bg-white p-3 rounded border">
                        <span id="${item.id}" class="font-mono senha-oculta" data-senha="${item.valor}">
                            ${'•'.repeat(item.valor.length)}
                        </span>
                        <div class="flex gap-1">
                            <button onclick="alternarVisibilidadeSenha('${item.id}')" class="text-gray-600 hover:text-gray-800">
                                <i class="fas fa-eye" id="${item.id}-olho"></i>
                            </button>
                            <button onclick="copiarSenha('${item.id}')" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Campo do nome do banco SQL
            grade.innerHTML += `
                <div class="bg-gray-50 p-4 rounded-lg border">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Nome Banco SQL:</label>
                    <input type="text" id="nome-bd-sql" class="w-full p-3 border rounded bg-white" placeholder="Digite o nome do banco">
                </div>
            `;
        }
        
        // =============================
        // MÁSCARAS DE INPUT
        // =============================
        
        function configurarMascaras() {
            // Máscara para CNPJ
            document.addEventListener('input', function(e) {
                if (e.target.classList.contains('mascara-cnpj')) {
                    let valor = e.target.value.replace(/\D/g, '');
                    valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
                    valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                    valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
                    valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
                    e.target.value = valor;
                }
            });
        }
        
        // =============================
        // SISTEMA DE ATENDIMENTOS
        // =============================
        
        function abrirAbaInferior(aba) {
            switch(aba) {
                case 'atendimentos-registros':
                    if (!verificarPermissao('atendimentos_registros')) {
                        mostrarToast('Você não tem permissão para acessar registros de atendimento', 'erro');
                        return;
                    }
                    document.getElementById('modal-atendimentos-registros').classList.remove('hidden');
                    carregarDadosAtendimentos();
                    break;
                case 'ferramentas':
                    mostrarToast('Use as abas acima para acessar as ferramentas', 'info');
                    break;
                case 'banco-dados':
                    if (!verificarPermissao('banco_dados')) {
                        mostrarToast('Você não tem permissão para acessar o banco de dados', 'erro');
                        return;
                    }
                    document.getElementById('modal-bd').classList.remove('hidden');
                    break;
                case 'downloads':
                    if (!verificarPermissao('downloads')) {
                        mostrarToast('Você não tem permissão para acessar downloads', 'erro');
                        return;
                    }
                    document.getElementById('modal-downloads').classList.remove('hidden');
                    carregarDownloads();
                    break;
                case 'sites':
                    if (!verificarPermissao('sites')) {
                        mostrarToast('Você não tem permissão para acessar sites', 'erro');
                        return;
                    }
                    document.getElementById('modal-sites').classList.remove('hidden');
                    carregarSites();
                    break;
                case 'conhecimento':
                    if (!verificarPermissao('conhecimento')) {
                        mostrarToast('Você não tem permissão para acessar a base de conhecimento', 'erro');
                        return;
                    }
                    document.getElementById('modal-conhecimento').classList.remove('hidden');
                    carregarBaseConhecimento();
                    break;
            }
        }

        async function carregarDadosAtendimentos() {
            // Carregar clientes
            const clientesSalvos = await carregarDoCloudflare('clientes');
            if (clientesSalvos) {
                clientes = clientesSalvos;
            }

            // Carregar atendimentos  
            const atendimentosSalvos = await carregarDoCloudflare('atendimentos');
            if (atendimentosSalvos) {
                atendimentos = atendimentosSalvos;
            }

            exibirClientes();
            exibirUltimosAtendimentos();
            popularFiltroAtendentes();
        }

        function abrirAbaAtendimento(nomeAba) {
            // Remover classe ativa de todas as abas
            document.querySelectorAll('.tab-atendimento').forEach(tab => {
                tab.classList.remove('border-blue-500', 'text-blue-600');
                tab.classList.add('border-transparent', 'text-gray-500');
            });

            // Ocultar todo conteúdo
            document.querySelectorAll('.tab-content-atendimento').forEach(content => {
                content.classList.add('hidden');
            });

            // Ativar aba clicada
            const tabButton = document.querySelector(`[data-tab="${nomeAba}"]`);
            if (tabButton) {
                tabButton.classList.remove('border-transparent', 'text-gray-500');
                tabButton.classList.add('border-blue-500', 'text-blue-600');
            }

            // Mostrar conteúdo correspondente
            const tabContent = document.getElementById(`tab-${nomeAba}`);
            if (tabContent) {
                tabContent.classList.remove('hidden');
            }
        }

        // Cadastro de Clientes
        document.getElementById('form-cadastro-cliente').addEventListener('submit', async function(e) {
            e.preventDefault();

            const cnpj = document.getElementById('cnpj-cliente-cadastro').value.trim();
            const razaoSocial = document.getElementById('razao-social-cliente').value.trim();
            const nomeFantasia = document.getElementById('nome-fantasia-cliente').value.trim();
            const telefone = document.getElementById('telefone-cliente').value.trim();
            const email = document.getElementById('email-cliente').value.trim();
            const responsavel = document.getElementById('responsavel-cliente').value.trim();
            const endereco = document.getElementById('endereco-cliente').value.trim();
            const observacoes = document.getElementById('observacoes-cliente').value.trim();

            if (!cnpj || !razaoSocial) {
                mostrarToast('CNPJ e Razão Social são obrigatórios', 'aviso');
                return;
            }

            // Verificar se cliente já existe
            if (clientes.find(c => c.cnpj === cnpj)) {
                mostrarToast('Cliente com este CNPJ já está cadastrado', 'erro');
                return;
            }

            const novoCliente = {
                id: Date.now(),
                cnpj,
                razaoSocial,
                nomeFantasia,
                telefone,
                email,
                responsavel,
                endereco,
                observacoes,
                criadoPor: usuarioAtual.id,
                criadoEm: new Date().toISOString()
            };

            clientes.push(novoCliente);
            await salvarNoCloudflare('clientes', clientes);

            // Limpar formulário
            document.getElementById('form-cadastro-cliente').reset();
            
            exibirClientes();
            mostrarToast('Cliente cadastrado com sucesso!', 'sucesso');
        });

        function exibirClientes() {
            const container = document.getElementById('lista-clientes');
            if (!container) return;

            container.innerHTML = clientes.map(cliente => `
                <div class="card-cliente bg-white border rounded-lg p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-gray-800">${cliente.razaoSocial}</h4>
                        <button onclick="editarCliente(${cliente.id})" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <div class="text-sm text-gray-600 space-y-1">
                        <div><strong>CNPJ:</strong> ${cliente.cnpj}</div>
                        ${cliente.nomeFantasia ? `<div><strong>Nome Fantasia:</strong> ${cliente.nomeFantasia}</div>` : ''}
                        ${cliente.telefone ? `<div><strong>Telefone:</strong> ${cliente.telefone}</div>` : ''}
                        ${cliente.responsavel ? `<div><strong>Responsável:</strong> ${cliente.responsavel}</div>` : ''}
                    </div>
                    <div class="mt-3 pt-2 border-t text-xs text-gray-500">
                        Cadastrado em ${new Date(cliente.criadoEm).toLocaleDateString('pt-BR')}
                    </div>
                </div>
            `).join('');
        }

        function buscarClientes() {
            const termo = document.getElementById('busca-clientes').value.toLowerCase().trim();
            const clientesFiltrados = termo ? 
                clientes.filter(cliente => 
                    cliente.razaoSocial.toLowerCase().includes(termo) ||
                    cliente.nomeFantasia.toLowerCase().includes(termo) ||
                    cliente.cnpj.includes(termo)
                ) : clientes;

            const container = document.getElementById('lista-clientes');
            container.innerHTML = clientesFiltrados.map(cliente => `
                <div class="card-cliente bg-white border rounded-lg p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-gray-800">${cliente.razaoSocial}</h4>
                        <button onclick="editarCliente(${cliente.id})" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <div class="text-sm text-gray-600 space-y-1">
                        <div><strong>CNPJ:</strong> ${cliente.cnpj}</div>
                        ${cliente.nomeFantasia ? `<div><strong>Nome Fantasia:</strong> ${cliente.nomeFantasia}</div>` : ''}
                        ${cliente.telefone ? `<div><strong>Telefone:</strong> ${cliente.telefone}</div>` : ''}
                        ${cliente.responsavel ? `<div><strong>Responsável:</strong> ${cliente.responsavel}</div>` : ''}
                    </div>
                    <div class="mt-3 pt-2 border-t text-xs text-gray-500">
                        Cadastrado em ${new Date(cliente.criadoEm).toLocaleDateString('pt-BR')}
                    </div>
                </div>
            `).join('');
        }

        function buscarClientePorCNPJ() {
            const cnpj = document.getElementById('cnpj-atendimento').value.trim();
            const infoContainer = document.getElementById('info-cliente-encontrado');
            
            if (!cnpj) {
                infoContainer.classList.add('hidden');
                return;
            }

            const cliente = clientes.find(c => c.cnpj === cnpj);
            
            if (cliente) {
                infoContainer.innerHTML = `
                    <div class="text-green-700">
                        <i class="fas fa-check-circle mr-2"></i>
                        <strong>Cliente encontrado:</strong> ${cliente.razaoSocial}
                        ${cliente.nomeFantasia ? ` (${cliente.nomeFantasia})` : ''}
                    </div>
                `;
                infoContainer.classList.remove('hidden');
            } else {
                infoContainer.innerHTML = `
                    <div class="text-red-700">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Cliente não encontrado. 
                        <button onclick="abrirAbaAtendimento('cadastro-clientes')" class="text-blue-600 hover:text-blue-800 underline">
                            Cadastrar novo cliente
                        </button>
                    </div>
                `;
                infoContainer.classList.remove('hidden');
            }
        }

        // Novo Atendimento
        document.getElementById('form-novo-atendimento').addEventListener('submit', async function(e) {
            e.preventDefault();

            const cnpj = document.getElementById('cnpj-atendimento').value.trim();
            const tipo = document.getElementById('tipo-atendimento').value;
            const protocolo = document.getElementById('protocolo-atendimento').value.trim() || `ATD${Date.now()}`;
            const assunto = document.getElementById('assunto-atendimento').value.trim();
            const tratativa = document.getElementById('tratativa-atendimento').value.trim();
            const status = document.getElementById('status-atendimento').value;
            const prioridade = document.getElementById('prioridade-atendimento').value;
            const anexosInput = document.getElementById('anexos-atendimento');

            if (!cnpj || !tipo || !assunto || !tratativa) {
                mostrarToast('Preencha todos os campos obrigatórios', 'aviso');
                return;
            }

            const novoAtendimento = {
                id: Date.now(),
                cnpj,
                tipo,
                protocolo,
                assunto,
                tratativa,
                status,
                prioridade,
                anexos: [],
                atendente: usuarioAtual.id,
                nomeAtendente: usuarioAtual.nomeCompleto,
                criadoEm: new Date().toISOString()
            };

            // Processar anexos
            if (anexosInput.files.length > 0) {
                const processarAnexos = Array.from(anexosInput.files).map(arquivo => {
                    return new Promise((resolve) => {
                        const leitor = new FileReader();
                        leitor.onload = function(e) {
                            novoAtendimento.anexos.push({
                                id: Date.now() + Math.random(),
                                nome: arquivo.name,
                                tipo: arquivo.type,
                                tamanho: arquivo.size,
                                urlDados: e.target.result
                            });
                            resolve();
                        };
                        leitor.readAsDataURL(arquivo);
                    });
                });
                
                await Promise.all(processarAnexos);
            }

            atendimentos.push(novoAtendimento);
            await salvarNoCloudflare('atendimentos', atendimentos);

            // Limpar formulário
            document.getElementById('form-novo-atendimento').reset();
            document.getElementById('info-cliente-encontrado').classList.add('hidden');
            
            exibirUltimosAtendimentos();
            mostrarToast('Atendimento registrado com sucesso!', 'sucesso');
        });

        function exibirUltimosAtendimentos() {
            const container = document.getElementById('ultimos-atendimentos');
            if (!container) return;

            const ultimosAtendimentos = atendimentos
                .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
                .slice(0, 10);

            container.innerHTML = ultimosAtendimentos.map(atendimento => {
                const cliente = clientes.find(c => c.cnpj === atendimento.cnpj);
                return `
                    <div class="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" 
                         onclick="visualizarAtendimento(${atendimento.id})">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-800">${atendimento.assunto}</h4>
                                <div class="text-sm text-gray-600">
                                    ${cliente ? cliente.razaoSocial : atendimento.cnpj} - ${atendimento.protocolo}
                                </div>
                            </div>
                            <span class="status-atendimento status-${atendimento.status}">
                                ${obterTextoStatus(atendimento.status)}
                            </span>
                        </div>
                        <div class="text-xs text-gray-500">
                            ${atendimento.nomeAtendente} - ${new Date(atendimento.criadoEm).toLocaleString('pt-BR')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function obterTextoStatus(status) {
            const statusTexto = {
                'pendente': 'Pendente',
                'em-andamento': 'Em Andamento', 
                'concluido': 'Concluído'
            };
            return statusTexto[status] || status;
        }

        function popularFiltroAtendentes() {
            const select = document.getElementById('filtro-atendente');
            if (!select) return;

            const atendentesUnicos = [...new Set(atendimentos.map(a => a.atendente))];
            const opcoesAtendentes = atendentesUnicos.map(atendenteId => {
                const usuario = usuarios.find(u => u.id === atendenteId);
                return usuario ? `<option value="${atendenteId}">${usuario.nomeCompleto}</option>` : '';
            }).join('');

            select.innerHTML = '<option value="">Todos os atendentes</option>' + opcoesAtendentes;
        }

        function pesquisarAtendimentos() {
            const filtros = {
                dataInicio: document.getElementById('filtro-data-inicio').value,
                dataFim: document.getElementById('filtro-data-fim').value,
                cnpj: document.getElementById('filtro-cnpj').value.trim(),
                protocolo: document.getElementById('filtro-protocolo').value.trim(),
                tipo: document.getElementById('filtro-tipo').value,
                status: document.getElementById('filtro-status').value,
                atendente: document.getElementById('filtro-atendente').value
            };

            let resultados = atendimentos.filter(atendimento => {
                // Filtro por data
                if (filtros.dataInicio) {
                    const dataAtendimento = new Date(atendimento.criadoEm).toISOString().split('T')[0];
                    if (dataAtendimento < filtros.dataInicio) return false;
                }
                if (filtros.dataFim) {
                    const dataAtendimento = new Date(atendimento.criadoEm).toISOString().split('T')[0];
                    if (dataAtendimento > filtros.dataFim) return false;
                }

                // Filtro por CNPJ
                if (filtros.cnpj && !atendimento.cnpj.includes(filtros.cnpj)) return false;

                // Filtro por protocolo
                if (filtros.protocolo && !atendimento.protocolo.toLowerCase().includes(filtros.protocolo.toLowerCase())) return false;

                // Filtro por tipo
                if (filtros.tipo && atendimento.tipo !== filtros.tipo) return false;

                // Filtro por status
                if (filtros.status && atendimento.status !== filtros.status) return false;

                // Filtro por atendente
                if (filtros.atendente && atendimento.atendente != filtros.atendente) return false;

                return true;
            });

            exibirResultadosPesquisa(resultados);
        }

        function exibirResultadosPesquisa(resultados) {
            const container = document.getElementById('resultados-pesquisa-atendimentos');
            const contador = document.getElementById('contador-resultados');
            
            contador.textContent = `${resultados.length} atendimentos encontrados`;

            if (resultados.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-inbox text-4xl mb-2"></i>
                        <p>Nenhum atendimento encontrado com os filtros selecionados</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = resultados.map(atendimento => {
                const cliente = clientes.find(c => c.cnpj === atendimento.cnpj);
                return `
                    <div class="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" 
                         onclick="visualizarAtendimento(${atendimento.id})">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-800">${atendimento.assunto}</h4>
                                <div class="text-sm text-gray-600">
                                    ${cliente ? cliente.razaoSocial : atendimento.cnpj} - ${atendimento.protocolo}
                                </div>
                            </div>
                            <span class="status-atendimento status-${atendimento.status}">
                                ${obterTextoStatus(atendimento.status)}
                            </span>
                        </div>
                        <div class="text-sm text-gray-600 mb-2">
                            Tipo: ${atendimento.tipo} | Prioridade: ${atendimento.prioridade}
                        </div>
                        <div class="text-xs text-gray-500">
                            ${atendimento.nomeAtendente} - ${new Date(atendimento.criadoEm).toLocaleString('pt-BR')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function limparFiltros() {
            document.getElementById('filtro-data-inicio').value = '';
            document.getElementById('filtro-data-fim').value = '';
            document.getElementById('filtro-cnpj').value = '';
            document.getElementById('filtro-protocolo').value = '';
            document.getElementById('filtro-tipo').value = '';
            document.getElementById('filtro-status').value = '';
            document.getElementById('filtro-atendente').value = '';
            
            document.getElementById('resultados-pesquisa-atendimentos').innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-search text-4xl mb-2"></i>
                    <p>Use os filtros acima para pesquisar atendimentos</p>
                </div>
            `;
            document.getElementById('contador-resultados').textContent = '0 atendimentos encontrados';
        }

        function visualizarAtendimento(id) {
            const atendimento = atendimentos.find(a => a.id === id);
            if (!atendimento) return;

            const cliente = clientes.find(c => c.cnpj === atendimento.cnpj);
            const modal = document.getElementById('modal-detalhes-atendimento');
            const conteudo = document.getElementById('conteudo-detalhes-atendimento');

            conteudo.innerHTML = `
                <div class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold text-lg mb-4">Informações do Atendimento</h4>
                            <div class="space-y-3">
                                <div><strong>Protocolo:</strong> ${atendimento.protocolo}</div>
                                <div><strong>Assunto:</strong> ${atendimento.assunto}</div>
                                <div><strong>Tipo:</strong> ${atendimento.tipo}</div>
                                <div><strong>Status:</strong> <span class="status-atendimento status-${atendimento.status}">${obterTextoStatus(atendimento.status)}</span></div>
                                <div><strong>Prioridade:</strong> ${atendimento.prioridade}</div>
                                <div><strong>Atendente:</strong> ${atendimento.nomeAtendente}</div>
                                <div><strong>Data:</strong> ${new Date(atendimento.criadoEm).toLocaleString('pt-BR')}</div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold text-lg mb-4">Informações do Cliente</h4>
                            ${cliente ? `
                                <div class="space-y-3">
                                    <div><strong>CNPJ:</strong> ${cliente.cnpj}</div>
                                    <div><strong>Razão Social:</strong> ${cliente.razaoSocial}</div>
                                    ${cliente.nomeFantasia ? `<div><strong>Nome Fantasia:</strong> ${cliente.nomeFantasia}</div>` : ''}
                                    ${cliente.telefone ? `<div><strong>Telefone:</strong> ${cliente.telefone}</div>` : ''}
                                    ${cliente.responsavel ? `<div><strong>Responsável:</strong> ${cliente.responsavel}</div>` : ''}
                                </div>
                            ` : `
                                <div class="text-gray-600">
                                    CNPJ: ${atendimento.cnpj}<br>
                                    <em>Cliente não cadastrado no sistema</em>
                                </div>
                            `}
                        </div>
                    </div>

                    <div>
                        <h4 class="font-semibold text-lg mb-4">Tratativa</h4>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <p class="whitespace-pre-wrap">${atendimento.tratativa}</p>
                        </div>
                    </div>

                    ${atendimento.anexos.length > 0 ? `
                        <div>
                            <h4 class="font-semibold text-lg mb-4">Anexos</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${atendimento.anexos.map(anexo => {
                                    if (anexo.tipo.startsWith('image/')) {
                                        return `
                                            <div class="border rounded-lg overflow-hidden">
                                                <img src="${anexo.urlDados}" alt="${anexo.nome}" class="w-full h-32 object-cover">
                                                <div class="p-2 text-sm">${anexo.nome}</div>
                                            </div>
                                        `;
                                    } else {
                                        return `
                                            <div class="border rounded-lg p-4 flex items-center">
                                                <i class="fas fa-file text-gray-500 text-2xl mr-3"></i>
                                                <div class="flex-1">
                                                    <div class="font-medium">${anexo.nome}</div>
                                                    <div class="text-sm text-gray-500">${formatarTamanhoArquivo(anexo.tamanho)}</div>
                                                </div>
                                                <button onclick="baixarAnexo('${anexo.urlDados}', '${anexo.nome}')" class="text-blue-600 hover:text-blue-800">
                                                    <i class="fas fa-download"></i>
                                                </button>
                                            </div>
                                        `;
                                    }
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            modal.classList.remove('hidden');
        }

        function exportarAtendimentos() {
            if (atendimentos.length === 0) {
                mostrarToast('Não há atendimentos para exportar', 'aviso');
                return;
            }

            const csv = [
                ['Data', 'Protocolo', 'CNPJ', 'Cliente', 'Assunto', 'Tipo', 'Status', 'Prioridade', 'Atendente', 'Tratativa'].join(';'),
                ...atendimentos.map(atendimento => {
                    const cliente = clientes.find(c => c.cnpj === atendimento.cnpj);
                    return [
                        new Date(atendimento.criadoEm).toLocaleString('pt-BR'),
                        atendimento.protocolo,
                        atendimento.cnpj,
                        cliente ? cliente.razaoSocial : 'Não cadastrado',
                        atendimento.assunto,
                        atendimento.tipo,
                        obterTextoStatus(atendimento.status),
                        atendimento.prioridade,
                        atendimento.nomeAtendente,
                        `"${atendimento.tratativa.replace(/"/g, '""')}"`
                    ].join(';');
                })
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `atendimentos_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }
        
        // =============================
        // FUNÇÕES DE UTILIDADE
        // =============================
        
        function copiarParaAreaTransferencia(texto) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(texto).then(() => {
                    mostrarToast('Copiado para a área de transferência!', 'sucesso');
                }).catch(() => {
                    fallbackCopiarTexto(texto);
                });
            } else {
                fallbackCopiarTexto(texto);
            }
        }
        
        function fallbackCopiarTexto(texto) {
            const areaTexto = document.createElement('textarea');
            areaTexto.value = texto;
            document.body.appendChild(areaTexto);
            areaTexto.focus();
            areaTexto.select();
            
            try {
                document.execCommand('copy');
                mostrarToast('Copiado para a área de transferência!', 'sucesso');
            } catch (err) {
                mostrarToast('Erro ao copiar texto', 'erro');
            }
            
            document.body.removeChild(areaTexto);
        }
        
        function mostrarToast(mensagem, tipo = 'info') {
            const toast = document.createElement('div');
            const cores = {
                sucesso: 'bg-green-600',
                erro: 'bg-red-600',
                aviso: 'bg-yellow-600',
                info: 'bg-blue-600'
            };
            
            const icones = {
                sucesso: 'fa-check-circle',
                erro: 'fa-exclamation-triangle',
                aviso: 'fa-exclamation-circle',
                info: 'fa-info-circle'
            };
            
            toast.className = `fixed top-4 right-4 ${cores[tipo]} text-white px-6 py-3 rounded-lg shadow-2xl z-50 transform transition-all duration-300 translate-x-full`;
            toast.innerHTML = `
                <div class="flex items-center">
                    <i class="fas ${icones[tipo]} mr-2"></i>
                    <span>${mensagem}</span>
                </div>
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => toast.classList.remove('translate-x-full'), 100);
            
            setTimeout(() => {
                toast.classList.add('translate-x-full');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        function formatarTamanhoArquivo(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const tamanhos = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + tamanhos[i];
        }
        
        // =============================
        // PWA
        // =============================
        
        function configurarPWA() {
            // Service Worker
            if ('serviceWorker' in navigator) {
                const codigoSW = `
                    const NOME_CACHE = 'sistema-gerenciador-v1';
                    
                    self.addEventListener('install', event => {
                        event.waitUntil(
                            caches.open(NOME_CACHE).then(cache => {
                                return cache.addAll(['/']);
                            })
                        );
                    });
                    
                    self.addEventListener('fetch', event => {
                        event.respondWith(
                            caches.match(event.request).then(response => {
                                return response || fetch(event.request);
                            })
                        );
                    });
                `;
                
                const blob = new Blob([codigoSW], { type: 'application/javascript' });
                const urlSW = URL.createObjectURL(blob);
                
                navigator.serviceWorker.register(urlSW)
                    .then(() => console.log('Service Worker registrado'))
                    .catch(erro => console.log('Erro no Service Worker:', erro));
            }
            
            // PWA Install Prompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                promptPWA = e;
                
                setTimeout(() => {
                    const banner = document.getElementById('banner-instalacao');
                    if (banner) {
                        banner.classList.add('mostrar');
                    }
                }, 3000);
            });
            
            window.addEventListener('appinstalled', () => {
                const banner = document.getElementById('banner-instalacao');
                if (banner) {
                    banner.classList.remove('mostrar');
                }
                mostrarToast('Aplicativo instalado com sucesso!', 'sucesso');
            });
        }
        
        function instalarPWA() {
            if (promptPWA) {
                promptPWA.prompt();
                promptPWA.userChoice.then((resultado) => {
                    if (resultado.outcome === 'accepted') {
                        console.log('PWA instalado');
                    }
                    promptPWA = null;
                });
            }
            dispensarBannerInstalacao();
        }
        
        function dispensarBannerInstalacao() {
            const banner = document.getElementById('banner-instalacao');
            if (banner) {
                banner.classList.remove('mostrar');
            }
        }
        
        // =============================
        // CONTROLES DE ADMINISTRADOR
        // =============================
        
        function configurarControlesAdmin() {
            const controlesAdminSites = document.getElementById('controles-admin-sites');
            const btnImportar = document.getElementById('botao-importar-sites');
            const elementosApenasAdmin = document.querySelectorAll('.apenas-admin');
            
            if (usuarioAtual && usuarioAtual.papel !== 'admin') {
                if (controlesAdminSites) controlesAdminSites.style.display = 'none';
                if (btnImportar) btnImportar.style.display = 'none';
                elementosApenasAdmin.forEach(el => el.classList.remove('mostrar'));
            } else {
                if (controlesAdminSites) controlesAdminSites.style.display = 'block';
                if (btnImportar) btnImportar.style.display = 'inline-block';
                elementosApenasAdmin.forEach(el => el.classList.add('mostrar'));
            }
        }
        
        // =============================
        // NAVEGAÇÃO E TABS
        // =============================
        
        function abrirAba(evt, nomeAba) {
            // Verificar permissão
            const permissaoNecessaria = evt.currentTarget.getAttribute('data-permissao');
            if (permissaoNecessaria && !verificarPermissao(permissaoNecessaria)) {
                mostrarToast('Você não tem permissão para acessar esta funcionalidade', 'erro');
                return;
            }
            
            const conteudosAba = document.getElementsByClassName('conteudo-aba');
            for (let i = 0; i < conteudosAba.length; i++) {
                conteudosAba[i].classList.remove('ativo');
            }
            
            const botoesAba = document.getElementsByClassName('botao-aba');
            for (let i = 0; i < botoesAba.length; i++) {
                botoesAba[i].classList.remove('border-blue-600', 'text-blue-600');
                botoesAba[i].classList.add('border-transparent', 'text-gray-600');
            }
            
            document.getElementById(nomeAba).classList.add('ativo');
            evt.currentTarget.classList.remove('border-transparent', 'text-gray-600');
            evt.currentTarget.classList.add('border-blue-600', 'text-blue-600');
        }
        
        function fecharModal(idModal) {
            document.getElementById(idModal).classList.add('hidden');
        }
        
        function alternarMenuConsulta() {
            if (!verificarPermissao('banco_dados')) {
                mostrarToast('Você não tem permissão para executar consultas SQL', 'erro');
                return;
            }
            
            const menu = document.getElementById('menu-consulta');
            const itensMenu = menu.querySelectorAll('.item-menu');
            
            if (menu.style.display === 'none' || !menu.style.display) {
                menu.style.display = 'block';
                setTimeout(() => {
                    itensMenu.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('mostrar');
                        }, index * 100);
                    });
                }, 50);
            } else {
                itensMenu.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.remove('mostrar');
                    }, index * 50);
                });
                setTimeout(() => {
                    menu.style.display = 'none';
                }, itensMenu.length * 50 + 200);
            }
        }
        
        // =============================
        // BASE DE CONHECIMENTO
        // =============================
        
        async function criarConteudoConhecimento() {
            if (!verificarPermissao('conhecimento') || usuarioAtual.papel !== 'admin') {
                mostrarToast('Apenas administradores podem criar conteúdo', 'erro');
                return;
            }
            
            const titulo = document.getElementById('titulo-conhecimento').value.trim();
            const categoria = document.getElementById('categoria-conhecimento').value;
            const conteudo = document.getElementById('conteudo-conhecimento').value.trim();
            const palavrasChave = document.getElementById('palavras-chave').value.trim();
            const arquivosInput = document.getElementById('arquivos-conhecimento');
            
            if (!titulo || !conteudo) {
                mostrarToast('Preencha pelo menos o título e o conteúdo', 'aviso');
                return;
            }
            
            const novoItem = {
                id: Date.now(),
                titulo,
                categoria,
                conteudo,
                palavrasChave: palavrasChave.split(',').map(p => p.trim()).filter(p => p),
                anexos: [],
                criadoPor: usuarioAtual.id,
                nomeAutor: usuarioAtual.nomeCompleto,
                criadoEm: new Date().toISOString()
            };
            
            // Processar arquivos anexados
            if (arquivosInput.files.length > 0) {
                const processarArquivos = Array.from(arquivosInput.files).map(arquivo => {
                    return new Promise((resolve) => {
                        const leitor = new FileReader();
                        leitor.onload = function(e) {
                            novoItem.anexos.push({
                                id: Date.now() + Math.random(),
                                nome: arquivo.name,
                                tipo: arquivo.type,
                                tamanho: arquivo.size,
                                urlDados: e.target.result
                            });
                            resolve();
                        };
                        leitor.readAsDataURL(arquivo);
                    });
                });
                
                await Promise.all(processarArquivos);
            }
            
            baseConhecimento.push(novoItem);
            await salvarNoCloudflare('baseConhecimento', baseConhecimento);
            
            // Limpar formulário
            document.getElementById('titulo-conhecimento').value = '';
            document.getElementById('conteudo-conhecimento').value = '';
            document.getElementById('palavras-chave').value = '';
            arquivosInput.value = '';
            
            exibirBaseConhecimento();
            mostrarToast('Conteúdo criado com sucesso!', 'sucesso');
        }
        
        function exibirBaseConhecimento() {
            const container = document.getElementById('lista-conhecimento');
            if (!container) return;
            
            container.innerHTML = baseConhecimento.map(item => `
                <div class="item-conhecimento bg-white border rounded-lg p-4 cursor-pointer hover:shadow-lg" onclick="visualizarConteudoConhecimento(${item.id})">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-lg text-gray-800">${item.titulo}</h4>
                        <span class="px-2 py-1 text-xs rounded-full ${obterCorCategoria(item.categoria)}">${item.categoria.toUpperCase()}</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-3 line-clamp-3">${item.conteudo.substring(0, 150)}${item.conteudo.length > 150 ? '...' : ''}</p>
                    
                    ${item.anexos.length > 0 ? `
                        <div class="flex flex-wrap gap-2 mb-3">
                            ${item.anexos.slice(0, 3).map(anexo => {
                                if (anexo.tipo.startsWith('image/')) {
                                    return `<img src="${anexo.urlDados}" alt="${anexo.nome}" class="w-12 h-12 object-cover rounded">`;
                                } else if (anexo.tipo.startsWith('video/')) {
                                    return `<div class="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                                        <i class="fas fa-video text-red-600"></i>
                                    </div>`;
                                } else {
                                    return `<div class="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                                        <i class="fas fa-file text-blue-600"></i>
                                    </div>`;
                                }
                            }).join('')}
                            ${item.anexos.length > 3 ? `<div class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs">+${item.anexos.length - 3}</div>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="flex flex-wrap gap-1 mb-2">
                        ${item.palavrasChave.slice(0, 3).map(palavra => `
                            <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">${palavra}</span>
                        `).join('')}
                    </div>
                    
                    <div class="text-xs text-gray-500 flex justify-between items-center">
                        <span>Por: ${item.nomeAutor}</span>
                        <span>${new Date(item.criadoEm).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    ${usuarioAtual.papel === 'admin' ? `
                        <div class="mt-2 pt-2 border-t">
                            <button onclick="event.stopPropagation(); removerConteudoConhecimento(${item.id})" class="text-red-600 hover:text-red-800 text-sm">
                                <i class="fas fa-trash mr-1"></i>Remover
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }
        
        function obterCorCategoria(categoria) {
            const cores = {
                manual: 'bg-blue-100 text-blue-800',
                procedimento: 'bg-green-100 text-green-800',
                tutorial: 'bg-purple-100 text-purple-800',
                faq: 'bg-yellow-100 text-yellow-800'
            };
            return cores[categoria] || 'bg-gray-100 text-gray-800';
        }
        
        function visualizarConteudoConhecimento(id) {
            const item = baseConhecimento.find(i => i.id === id);
            if (!item) return;
            
            const modal = document.getElementById('modal-visualizar-conhecimento');
            const tituloModal = document.getElementById('titulo-conteudo-modal');
            const conteudoModal = document.getElementById('conteudo-modal');
            
            tituloModal.textContent = item.titulo;
            
            let htmlConteudo = `
                <div class="mb-4">
                    <span class="px-3 py-1 text-sm rounded-full ${obterCorCategoria(item.categoria)}">${item.categoria.toUpperCase()}</span>
                </div>
                
                <div class="prose max-w-none mb-6">
                    <p class="whitespace-pre-wrap">${item.conteudo}</p>
                </div>
            `;
            
            if (item.anexos.length > 0) {
                htmlConteudo += '<div class="mb-6"><h4 class="font-semibold mb-4">Anexos:</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
                
                item.anexos.forEach(anexo => {
                    if (anexo.tipo.startsWith('image/')) {
                        htmlConteudo += `
                            <div class="border rounded-lg overflow-hidden">
                                <img src="${anexo.urlDados}" alt="${anexo.nome}" class="w-full h-48 object-cover">
                                <div class="p-2 text-sm text-gray-600">${anexo.nome}</div>
                            </div>
                        `;
                    } else if (anexo.tipo.startsWith('video/')) {
                        htmlConteudo += `
                            <div class="border rounded-lg overflow-hidden">
                                <div class="video-responsivo">
                                    <video controls>
                                        <source src="${anexo.urlDados}" type="${anexo.tipo}">
                                        Seu navegador não suporta o vídeo.
                                    </video>
                                </div>
                                <div class="p-2 text-sm text-gray-600">${anexo.nome}</div>
                            </div>
                        `;
                    } else {
                        htmlConteudo += `
                            <div class="border rounded-lg p-4 flex items-center">
                                <div class="w-12 h-12 bg-blue-100 rounded flex items-center justify-center mr-3">
                                    <i class="fas fa-file text-blue-600"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium">${anexo.nome}</div>
                                    <div class="text-sm text-gray-500">${formatarTamanhoArquivo(anexo.tamanho)}</div>
                                </div>
                                <button onclick="baixarAnexo('${anexo.urlDados}', '${anexo.nome}')" class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        `;
                    }
                });
                
                htmlConteudo += '</div></div>';
            }
            
            htmlConteudo += `
                <div class="border-t pt-4 text-sm text-gray-500">
                    <div>Criado por: ${item.nomeAutor}</div>
                    <div>Data: ${new Date(item.criadoEm).toLocaleString('pt-BR')}</div>
                    ${item.palavrasChave.length > 0 ? `
                        <div class="mt-2">
                            Palavras-chave: ${item.palavrasChave.map(p => `<span class="px-2 py-1 bg-gray-100 rounded text-xs mr-1">${p}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            
            conteudoModal.innerHTML = htmlConteudo;
            modal.classList.remove('hidden');
        }
        
        async function removerConteudoConhecimento(id) {
            if (confirm('Tem certeza que deseja remover este conteúdo?')) {
                baseConhecimento = baseConhecimento.filter(item => item.id !== id);
                await salvarNoCloudflare('baseConhecimento', baseConhecimento);
                exibirBaseConhecimento();
                mostrarToast('Conteúdo removido!', 'sucesso');
            }
        }
        
        function pesquisarConhecimento() {
            const termoBusca = document.getElementById('busca-conhecimento').value.toLowerCase().trim();
            const resultados = document.getElementById('resultados-busca');
            
            if (termoBusca.length < 2) {
                resultados.classList.add('hidden');
                return;
            }
            
            const itensEncontrados = baseConhecimento.filter(item => 
                item.titulo.toLowerCase().includes(termoBusca) ||
                item.conteudo.toLowerCase().includes(termoBusca) ||
                item.palavrasChave.some(palavra => palavra.toLowerCase().includes(termoBusca))
            );
            
            if (itensEncontrados.length > 0) {
                resultados.innerHTML = itensEncontrados.map(item => `
                    <div class="p-3 hover:bg-gray-50 cursor-pointer border-b" onclick="visualizarConteudoConhecimento(${item.id}); document.getElementById('resultados-busca').classList.add('hidden');">
                        <div class="font-medium">${item.titulo}</div>
                        <div class="text-sm text-gray-600">${item.conteudo.substring(0, 100)}...</div>
                    </div>
                `).join('');
                resultados.classList.remove('hidden');
            } else {
                resultados.innerHTML = '<div class="p-3 text-gray-500">Nenhum resultado encontrado</div>';
                resultados.classList.remove('hidden');
            }
        }
        
        function baixarAnexo(urlDados, nomeArquivo) {
            const link = document.createElement('a');
            link.href = urlDados;
            link.download = nomeArquivo;
            link.click();
        }
        
        // =============================
        // CARREGAMENTO DE DADOS
        // =============================
        
        async function carregarTodosDados() {
            await carregarMenus();
            await carregarAnotacoes();
            await carregarConsultas();
            await carregarDownloads();
            await carregarSites();
            await carregarUsuarios();
            await carregarAnotacoesAtendimento();
            await carregarTarefas();
            await carregarTarefasPessoais();
            await carregarEscalaPessoal();
            await carregarTarefasAtribuidas();
            await carregarEscalasUsuarios();
            await carregarBaseConhecimento();
            atualizarCalendario();
            atualizarMuralEscalas();
            atualizarEstatisticasAgenda();
            popularSelectsUsuarios();
        }
        
        async function carregarMenus() {
            const menusSalvos = await carregarDoCloudflare('menus');
            if (menusSalvos) {
                menus = menusSalvos;
                exibirMenus();
            }
        }
        
        async function carregarAnotacoes() {
            const anotacoesSalvas = await carregarDoCloudflare('anotacoes');
            if (anotacoesSalvas) {
                anotacoes = anotacoesSalvas.filter(a => a.idUsuario === usuarioAtual.id);
                exibirAnotacoes();
            }
        }
        
        async function carregarConsultas() {
            const consultasSalvasStorage = await carregarDoCloudflare('consultasSalvas');
            if (consultasSalvasStorage) {
                consultasSalvas = consultasSalvasStorage.filter(c => c.idUsuario === usuarioAtual.id);
                exibirConsultas();
                atualizarSelectConsulta();
            }
        }
        
        async function carregarDownloads() {
            const downloadsSalvos = await carregarDoCloudflare('downloads');
            if (downloadsSalvos) {
                downloads = downloadsSalvos.filter(d => d.idUsuario === usuarioAtual.id);
                exibirDownloads();
            }
        }
        
        async function carregarSites() {
            const sitesSalvos = await carregarDoCloudflare('sites');
            if (sitesSalvos) {
                sites = sitesSalvos;
            } else {
                // Sites padrão
                sites = [
                    { id: 1, nome: 'Google', url: 'https://www.google.com', criadoEm: new Date().toISOString() },
                    { id: 2, nome: 'GitHub', url: 'https://github.com', criadoEm: new Date().toISOString() },
                    { id: 3, nome: 'Stack Overflow', url: 'https://stackoverflow.com', criadoEm: new Date().toISOString() }
                ];
                await salvarNoCloudflare('sites', sites);
            }
            exibirSites();
        }
        
        async function carregarBaseConhecimento() {
            const conhecimentoSalvo = await carregarDoCloudflare('baseConhecimento');
            if (conhecimentoSalvo) {
                baseConhecimento = conhecimentoSalvo;
            }
        }
        
        // Placeholder functions - implementações simplificadas
        async function exibirMenus() { 
            // Implementação simplificada
            const container = document.getElementById('lista-menus');
            if (container) {
                container.innerHTML = menus.map(menu => `
                    <div class="bg-gray-50 p-3 rounded border">
                        <strong>${menu.nome}:</strong> ${menu.texto}
                    </div>
                `).join('');
            }
        }
        
        async function exibirAnotacoes() {
            const container = document.getElementById('lista-anotacoes');
            if (container) {
                container.innerHTML = anotacoes.map(anotacao => `
                    <div class="bg-gray-50 p-3 rounded border">
                        <strong>${anotacao.titulo}:</strong> ${anotacao.conteudo}
                    </div>
                `).join('');
            }
        }
        
        async function exibirConsultas() {
            const container = document.getElementById('consultas-salvas');
            if (container) {
                container.innerHTML = consultasSalvas.map(consulta => `
                    <div class="bg-gray-50 p-3 rounded border">
                        <strong>${consulta.nome}:</strong> ${consulta.sql.substring(0, 100)}...
                    </div>
                `).join('');
            }
        }
        
        async function exibirDownloads() {
            const container = document.getElementById('lista-downloads');
            if (container) {
                container.innerHTML = downloads.map(download => `
                    <div class="bg-gray-50 p-3 rounded border">
                        <a href="${download.url}" target="_blank" class="text-blue-600">${download.nome}</a>
                    </div>
                `).join('');
            }
        }
        
        async function exibirSites() {
            const container = document.getElementById('lista-sites');
            if (container) {
                container.innerHTML = sites.map(site => `
                    <div class="bg-gray-50 p-3 rounded border flex justify-between items-center">
                        <a href="${site.url}" target="_blank" class="text-blue-600">${site.nome}</a>
                        ${usuarioAtual.papel === 'admin' ? `<button onclick="removerSite(${site.id})" class="text-red-600"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                `).join('');
            }
        }
        
        // Implementações básicas das funções
        function carregarUsuarios() { /* implementar */ }
        function carregarAnotacoesAtendimento() { /* implementar */ }
        function carregarTarefas() { /* implementar */ }
        function carregarTarefasPessoais() { /* implementar */ }
        function carregarEscalaPessoal() { /* implementar */ }
        function carregarTarefasAtribuidas() { /* implementar */ }
        function carregarEscalasUsuarios() { /* implementar */ }
        function atualizarCalendario() { /* implementar */ }
        function atualizarMuralEscalas() { /* implementar */ }
        function atualizarEstatisticasAgenda() { /* implementar */ }
        function popularSelectsUsuarios() { /* implementar */ }
        function atualizarSelectConsulta() { /* implementar */ }
        
        function adicionarMenu() {
            const nome = document.getElementById('nome-menu').value.trim();
            const texto = document.getElementById('texto-menu').value.trim();
            if (nome && texto) {
                menus.push({ id: Date.now(), nome, texto, criadoEm: new Date().toISOString() });
                salvarNoCloudflare('menus', menus);
                document.getElementById('nome-menu').value = '';
                document.getElementById('texto-menu').value = '';
                exibirMenus();
                mostrarToast('Menu adicionado!', 'sucesso');
            }
        }
        
        function salvarAnotacao() {
            const titulo = document.getElementById('titulo-anotacao').value.trim();
            const conteudo = document.getElementById('area-anotacoes').value.trim();
            if (titulo && conteudo) {
                anotacoes.push({ 
                    id: Date.now(), 
                    titulo, 
                    conteudo, 
                    idUsuario: usuarioAtual.id,
                    criadoEm: new Date().toISOString() 
                });
                salvarNoCloudflare('anotacoes', anotacoes);
                document.getElementById('titulo-anotacao').value = '';
                document.getElementById('area-anotacoes').value = '';
                exibirAnotacoes();
                mostrarToast('Anotação salva!', 'sucesso');
            }
        }
        
        function salvarConsulta() {
            const nome = document.getElementById('nome-consulta').value.trim();
            const sql = document.getElementById('consulta-sql').value.trim();
            if (nome && sql) {
                consultasSalvas.push({ 
                    id: Date.now(), 
                    nome, 
                    sql, 
                    idUsuario: usuarioAtual.id,
                    criadoEm: new Date().toISOString() 
                });
                salvarNoCloudflare('consultasSalvas', consultasSalvas);
                document.getElementById('nome-consulta').value = '';
                document.getElementById('consulta-sql').value = '';
                exibirConsultas();
                mostrarToast('Consulta salva!', 'sucesso');
            }
        }
        
        function validarXML() { 
            mostrarToast('Função de validação XML em desenvolvimento', 'info');
        }
        
        function formatarXML() { 
            mostrarToast('Função de formatação XML em desenvolvimento', 'info');
        }
        
        function criarUsuario() { 
            mostrarToast('Função de criação de usuário em desenvolvimento', 'info');
        }
        
        function salvarAnotacaoAtendimento() { 
            mostrarToast('Função de anotação de atendimento em desenvolvimento', 'info');
        }
        
        function criarTarefa() { 
            mostrarToast('Função de criação de tarefa em desenvolvimento', 'info');
        }
        
        function soltar() { 
            mostrarToast('Função de drag and drop em desenvolvimento', 'info');
        }
        
        function permitirSoltar() { 
            /* implementar */
        }
        
        function adicionarTarefaPessoal() { 
            mostrarToast('Função de tarefa pessoal em desenvolvimento', 'info');
        }
        
        function salvarEscalaPadrao() { 
            mostrarToast('Função de escala padrão em desenvolvimento', 'info');
        }
        
        function adicionarEntradaEscala() { 
            mostrarToast('Função de entrada escala em desenvolvimento', 'info');
        }
        
        function mudarMes() { 
            mostrarToast('Função de calendário em desenvolvimento', 'info');
        }
        
        function irParaHoje() { 
            mostrarToast('Função de calendário em desenvolvimento', 'info');
        }
        
        function atribuirTarefaAoUsuario() { 
            mostrarToast('Função de atribuição de tarefa em desenvolvimento', 'info');
        }
        
        function definirEscalaUsuario() { 
            mostrarToast('Função de escala de usuário em desenvolvimento', 'info');
        }
        
        function gerarRelatorioAgenda() { 
            mostrarToast('Função de relatório em desenvolvimento', 'info');
        }
        
        function conectarBancoDados() { 
            mostrarToast('Função de conexão BD em desenvolvimento', 'info');
        }
        
        function testarConexao() { 
            mostrarToast('Função de teste de conexão em desenvolvimento', 'info');
        }
        
        function abrirExecutorConsulta() { 
            mostrarToast('Função de executor de consulta em desenvolvimento', 'info');
        }
        
        function reconectarBancoDados() { 
            mostrarToast('Função de reconexão BD em desenvolvimento', 'info');
        }
        
        function carregarConsultaSalva() { 
            mostrarToast('Função de carregar consulta em desenvolvimento', 'info');
        }
        
        function executarConsulta() { 
            mostrarToast('Função de executar consulta em desenvolvimento', 'info');
        }
        
        function formatarConsultaSQL() { 
            mostrarToast('Função de formatação SQL em desenvolvimento', 'info');
        }
        
        function limparConsulta() { 
            document.getElementById('executar-consulta').value = '';
        }
        
        function exportarResultados() { 
            mostrarToast('Função de exportar resultados em desenvolvimento', 'info');
        }
        
        function adicionarDownload() { 
            const nome = document.getElementById('nome-download').value.trim();
            const url = document.getElementById('url-download').value.trim();
            if (nome && url) {
                downloads.push({ 
                    id: Date.now(), 
                    nome, 
                    url, 
                    idUsuario: usuarioAtual.id,
                    criadoEm: new Date().toISOString() 
                });
                salvarNoCloudflare('downloads', downloads);
                document.getElementById('nome-download').value = '';
                document.getElementById('url-download').value = '';
                exibirDownloads();
                mostrarToast('Download adicionado!', 'sucesso');
            }
        }
        
        function limparTodosDownloads() { 
            if (confirm('Tem certeza que deseja limpar todos os downloads?')) {
                downloads = [];
                salvarNoCloudflare('downloads', downloads);
                exibirDownloads();
                mostrarToast('Downloads limpos!', 'sucesso');
            }
        }
        
        function adicionarSite() { 
            const nome = document.getElementById('nome-site').value.trim();
            const url = document.getElementById('url-site').value.trim();
            if (nome && url) {
                sites.push({ 
                    id: Date.now(), 
                    nome, 
                    url, 
                    criadoEm: new Date().toISOString() 
                });
                salvarNoCloudflare('sites', sites);
                document.getElementById('nome-site').value = '';
                document.getElementById('url-site').value = '';
                exibirSites();
                mostrarToast('Site adicionado!', 'sucesso');
            }
        }
        
        function removerSite(id) {
            if (confirm('Tem certeza que deseja remover este site?')) {
                sites = sites.filter(s => s.id !== id);
                salvarNoCloudflare('sites', sites);
                exibirSites();
                mostrarToast('Site removido!', 'sucesso');
            }
        }
        
        function importarSites() { 
            mostrarToast('Função de importar sites em desenvolvimento', 'info');
        }
        
        function exportarSites() { 
            const csv = sites.map(site => `${site.nome};${site.url}`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'sites.csv';
            link.click();
        }
        
        // Ocultar resultados da busca quando clicar fora
        document.addEventListener('click', function(e) {
            const buscaConhecimento = document.getElementById('busca-conhecimento');
            const resultadosBusca = document.getElementById('resultados-busca');
            
            if (buscaConhecimento && resultadosBusca && !e.target.closest('.busca-conhecimento')) {
                resultadosBusca.classList.add('hidden');
            }
        });
        
        // =============================
        // EVENTOS DE CONEXÃO
        // =============================
        
        window.addEventListener('online', () => {
            informacoesSistema.online = true;
            atualizarDisplayInformacoesSistema();
            mostrarToast('Conexão restaurada', 'sucesso');
            // Sincronizar dados quando voltar online
            sincronizarDados();
        });
        
        window.addEventListener('offline', () => {
            informacoesSistema.online = false;
            atualizarDisplayInformacoesSistema();
            mostrarToast('Conexão perdida - dados salvos localmente', 'aviso');
        });
        
        // =============================
        // ATUALIZAÇÃO PERIÓDICA
        // =============================
        
        setInterval(() => {
            informacoesSistema.horarioAtual = new Date().toLocaleString('pt-BR');
            // Atualizar senha dinâmica
            const agora = new Date();
            const dia = agora.getDate();
            const mes = agora.getMonth() + 1;
            const sufixoAno = parseInt(agora.getFullYear().toString().slice(-2));
            const soma = dia + mes + sufixoAno;
            informacoesSistema.senhaDinamica = `AdmPwd20${soma}`;
            senhas['senha-dinamica'] = informacoesSistema.senhaDinamica;
            
            atualizarDisplayInformacoesSistema();
            atualizarDisplaySenhas();
        }, 60000); // Atualizar a cada minuto
        
        // Sincronização automática a cada 5 minutos (se online)
        setInterval(() => {
            if (navigator.onLine) {
                sincronizarDados();
            }
        }, 300000);
        
    

window.onload=function(){var d=document.createElement("div");d.id="aionspaceLoadFinished";document.body.appendChild(d);};