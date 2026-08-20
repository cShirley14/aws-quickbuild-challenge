{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [ pkgs.nodejs ];

  shellHook = ''
    if [ ! -d node_modules ]; then
      npm install
    fi

    echo ""
    echo "  🎸 Tabernacle Concierge ready"
    echo "  Run: npx vite --open &"
    echo ""
  '';
}
